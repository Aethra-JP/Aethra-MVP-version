"""Adaptive data processor: turns a messy CSV/Excel export into a clean table plus a profile.

Handles: title rows above the header, odd encodings and delimiters, Indian number styles
(1,23,456 / Rs. / rupee sign / brackets for negatives), dd/mm/yyyy dates, Excel serial dates,
total rows, repeated headers, duplicate rows and blank rows/columns. Every change is logged.
"""
import csv
import io
import re
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from . import importers
from .util import jsonable

ROLE_RULES = {
    "date": (["date", "invoice_date", "bill_date", "voucher_date", "transaction_date", "txn_date", "order_date", "day"],
             ["date", "dt", "month", "period"]),
    "amount": (["amount", "net_amount", "sales", "revenue", "taxable_value", "gross_total", "invoice_value",
                "sale_amount", "turnover", "total", "value"], ["amount", "sales", "revenue", "turnover", "value"]),
    "quantity": (["quantity", "qty", "units", "pcs", "nos", "volume"], ["qty", "quantity", "units"]),
    "price": (["price", "unit_price", "rate", "mrp"], ["price", "mrp"]),
    "cost": (["cost", "cogs", "purchase_cost", "purchase", "expense", "expenses", "buying_price"],
             ["cost", "cogs", "expense", "purchase"]),
    "product": (["product", "item", "item_name", "sku", "product_name", "description", "material"],
                ["product", "item", "sku", "material", "description"]),
    "category": (["category", "group", "segment", "brand", "type", "department"],
                 ["category", "group", "segment", "brand", "department"]),
    "customer": (["customer", "party", "client", "buyer", "customer_name", "party_name"],
                 ["customer", "party", "client", "buyer"]),
}
ROLE_KIND = {"date": "date", "amount": "number", "quantity": "number", "price": "number", "cost": "number",
             "product": "text", "category": "text", "customer": "text"}
ROLE_ORDER = ["date", "amount", "quantity", "price", "cost", "product", "category", "customer"]


@dataclass
class ProcessResult:
    df: pd.DataFrame
    roles: dict
    profile: dict
    overview: dict
    log: list = field(default_factory=list)
    source: str = "generic"


def textlike(s: pd.Series) -> bool:
    """True for object columns and for pandas' newer string dtype."""
    return s.dtype == object or (pd.api.types.is_string_dtype(s) and not pd.api.types.is_numeric_dtype(s))


def norm_name(c) -> str:
    s = re.sub(r"[^0-9a-zA-Z\u0900-\u097F]+", "_", str(c).strip().lower()).strip("_")
    return s or "col"


def _dedupe(names):
    seen, out = {}, []
    for n in names:
        if n in seen:
            seen[n] += 1
            out.append(f"{n}_{seen[n]}")
        else:
            seen[n] = 1
            out.append(n)
    return out


def decode(raw: bytes) -> str:
    for enc in ("utf-8-sig", "cp1252"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("latin-1", errors="ignore")


def read_table(raw: bytes, filename: str) -> pd.DataFrame:
    name = (filename or "").lower()
    if name.endswith(".xls"):
        raise ValueError("Old .xls files are not supported. Please save the file as .xlsx or .csv and upload again.")
    if name.endswith((".xlsx", ".xlsm")):
        xl = pd.ExcelFile(io.BytesIO(raw))
        best, best_n = None, -1
        for sh in xl.sheet_names:
            d = xl.parse(sh, header=None, dtype=object)
            n = int(d.notna().sum().sum())
            if n > best_n:
                best, best_n = d, n
        return best
    text = decode(raw)
    try:
        sep = csv.Sniffer().sniff(text[:5000], delimiters=",;\t|").delimiter
    except Exception:
        sep = ","
    # csv.reader + padding copes with ragged rows (title lines, totals with stray commas)
    rows = [r for r in csv.reader(io.StringIO(text), delimiter=sep) if any(c.strip() for c in r)]
    if not rows:
        raise ValueError("The file is empty.")
    width = min(max(len(r) for r in rows), 200)
    rows = [(r + [None] * (width - len(r)))[:width] for r in rows]
    return pd.DataFrame(rows, dtype=object).replace("", np.nan)


_NUM_RE = re.compile(r"^[\(\-+]?\s*(₹|rs\.?|inr)?\s*[\d,]+(\.\d+)?\s*\)?\s*(dr|cr)?\.?$", re.I)


def _is_num(v) -> bool:
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return False
    if isinstance(v, (int, float, np.number)):
        return True
    return bool(_NUM_RE.match(str(v).strip()))


def find_header_row(raw_df: pd.DataFrame, max_scan: int = 15) -> int:
    best_i, best = 0, -1
    for i in range(min(max_scan, len(raw_df))):
        score = sum(1 for v in raw_df.iloc[i] if pd.notna(v) and str(v).strip() != "" and not _is_num(v))
        if score > best:
            best_i, best = i, score
    return best_i


def to_number(s: pd.Series) -> pd.Series:
    t = s.astype(str).str.strip()
    neg = t.str.startswith("(") & t.str.endswith(")")
    t = t.str.replace(r"[()]", "", regex=True)
    t = t.str.replace(r"(₹|rs\.?|inr|\$)", "", regex=True, case=False)
    t = t.str.replace(",", "", regex=False).str.replace(r"\s+", "", regex=True)
    t = t.str.replace(r"(dr|cr)\.?$", "", regex=True, case=False)
    num = pd.to_numeric(t, errors="coerce")
    num[neg] = -num[neg]
    num[s.isna()] = np.nan
    return num


_DATE_RE = re.compile(r"^\s*(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})")


def detect_dayfirst(s: pd.Series):
    """Decide day-first (31/12/2025) or month-first (12/31/2025) from the values themselves."""
    a_big = b_big = 0
    for v in s.dropna().astype(str).head(5000):
        m = _DATE_RE.match(v)
        if not m or len(m.group(1)) == 4:  # ISO yyyy-mm-dd needs no guess
            continue
        a_big += int(m.group(1)) > 12   # first number can only be a day
        b_big += int(m.group(2)) > 12   # second number can only be a day
    if b_big > a_big:
        return False, "month-first, US style"
    if a_big > b_big:
        return True, "day-first, Indian style"
    return True, "day-first, assumed because every date was ambiguous"


def to_date(s: pd.Series, dayfirst: bool = True) -> pd.Series:
    try:
        return pd.to_datetime(s, dayfirst=dayfirst, errors="coerce", format="mixed")
    except (TypeError, ValueError):
        return pd.to_datetime(s, dayfirst=dayfirst, errors="coerce")


def _convert_types(df: pd.DataFrame, log: list) -> pd.DataFrame:
    for c in list(df.columns):
        s = df[c]
        if pd.api.types.is_numeric_dtype(s) and any(h in c for h in ("date", "dt", "day")):
            nn0 = s.dropna()
            if len(nn0) and nn0.between(20000, 70000).all():  # Excel stores dates as day numbers
                df[c] = pd.to_datetime(s, unit="D", origin="1899-12-30", errors="coerce")
                log.append(f"Converted Excel serial numbers in '{c}' to dates.")
            continue
        if not textlike(s):
            continue
        nn = s.dropna()
        if nn.empty:
            continue
        if isinstance(nn.iloc[0], (pd.Timestamp,)) or type(nn.iloc[0]).__name__ in ("datetime", "date"):
            df[c] = pd.to_datetime(s, errors="coerce")
            log.append(f"Read '{c}' as dates.")
            continue
        hint_date = any(h in c for h in ("date", "dt", "day"))
        num = to_number(s)
        ok = num.notna().sum()
        if hint_date and ok >= 0.8 * len(nn) and num.dropna().between(20000, 70000).all():
            df[c] = pd.to_datetime(num, unit="D", origin="1899-12-30", errors="coerce")
            log.append(f"Converted Excel serial numbers in '{c}' to dates.")
            continue
        if ok >= 0.8 * len(nn):
            df[c] = num
            had_fmt = s.astype(str).str.contains(r"[₹,()]|rs\.?|inr", case=False, regex=True).any()
            if had_fmt:
                log.append(f"Converted '{c}' to numbers (removed currency symbols, commas and brackets).")
            continue
        if nn.astype(str).str.contains(r"\d").mean() > 0.8:
            dayfirst, how = detect_dayfirst(s)
            d = to_date(s, dayfirst)
            if d.notna().sum() >= 0.8 * len(nn):
                df[c] = d
                log.append(f"Parsed '{c}' as dates ({how}).")
    return df


def infer_roles(df: pd.DataFrame) -> dict:
    roles, used = {}, set()

    def kind_ok(col, kind):
        s = df[col]
        if kind == "date":
            return pd.api.types.is_datetime64_any_dtype(s)
        if kind == "number":
            return pd.api.types.is_numeric_dtype(s)
        return textlike(s)

    for role in ROLE_ORDER:
        exact, contains = ROLE_RULES[role]
        kind = ROLE_KIND[role]
        pick = next((c for c in exact if c in df.columns and c not in used and kind_ok(c, kind)), None)
        if pick is None:
            pick = next((c for c in df.columns if c not in used and kind_ok(c, kind)
                         and any(h in c.split("_") or h in c for h in contains)), None)
        if pick is not None:
            roles[role] = pick
            used.add(pick)
    if "date" not in roles:
        dc = next((c for c in df.columns if pd.api.types.is_datetime64_any_dtype(df[c])), None)
        if dc:
            roles["date"] = dc
            used.add(dc)
    if "amount" not in roles:
        nums = [c for c in df.columns if c not in used and pd.api.types.is_numeric_dtype(df[c])]
        if nums:
            roles["amount"] = max(nums, key=lambda c: float(df[c].abs().sum()))
    return roles


def build_profile(df: pd.DataFrame, roles: dict):
    cols = []
    for c in df.columns:
        s = df[c]
        info = {"name": c, "null_pct": round(float(s.isna().mean() * 100), 1), "unique": int(s.nunique())}
        if pd.api.types.is_datetime64_any_dtype(s):
            info.update(kind="date", min=s.min(), max=s.max())
        elif pd.api.types.is_numeric_dtype(s):
            info.update(kind="number", min=s.min(), max=s.max(), mean=s.mean(), sum=s.sum())
        else:
            info.update(kind="text", top=[str(v) for v in s.value_counts().head(3).index])
        cols.append(info)
    ov = {"rows": int(len(df)), "columns": int(df.shape[1])}
    d, m = roles.get("date"), roles.get("amount")
    if d:
        ov["date_from"], ov["date_to"] = df[d].min(), df[d].max()
    if m:
        ov.update(measure=m, total=float(df[m].sum()), average=float(df[m].mean()))
        for dim in ("product", "category", "customer"):
            if dim in roles and df[roles[dim]].nunique() > 1:
                top = df.groupby(roles[dim])[m].sum().sort_values(ascending=False)
                ov[f"top_{dim}"] = {"name": str(top.index[0]), "value": float(top.iloc[0])}
    return jsonable(cols), jsonable(ov)


def process(raw: bytes, filename: str, source_type: str = "auto") -> ProcessResult:
    log = []
    raw_df = read_table(raw, filename)
    raw_df = raw_df.dropna(how="all").dropna(axis=1, how="all").reset_index(drop=True)
    if raw_df.empty:
        raise ValueError("The file has no data rows. Please check the file and upload again.")
    hi = find_header_row(raw_df)
    if hi > 0:
        log.append(f"Skipped {hi} title row(s) above the header.")
    hdr_vals = [str(v).strip().lower() if pd.notna(v) else "" for v in raw_df.iloc[hi]]
    header = _dedupe([norm_name(v) if pd.notna(v) else f"col_{j}" for j, v in enumerate(raw_df.iloc[hi])])
    df = raw_df.iloc[hi + 1:].copy()
    df.columns = header
    df = df.reset_index(drop=True)
    # strip text, turn placeholders into blanks
    for c in df.columns:
        if textlike(df[c]):
            df[c] = df[c].map(lambda v: v.strip() if isinstance(v, str) else v)
    df = df.replace(r"^\s*(-|--|nan|NaN|NA|N/A|null|NULL)?\s*$", np.nan, regex=True)
    df = df.dropna(how="all").dropna(axis=1, how="all").reset_index(drop=True)
    # repeated header rows
    first = df.columns[0]
    cand = df[first].astype(str).str.strip().str.lower() == hdr_vals[0] if hdr_vals[0] else pd.Series(False, index=df.index)
    if cand.any():
        def is_hdr(row):
            return sum(str(v).strip().lower() == h for v, h in zip(row, hdr_vals)) >= max(2, 0.6 * len(hdr_vals))
        rep = df[cand].apply(is_hdr, axis=1)
        drop_idx = rep[rep].index
        if len(drop_idx):
            df = df.drop(index=drop_idx).reset_index(drop=True)
            log.append(f"Removed {len(drop_idx)} repeated header row(s).")
    # total rows
    mask = pd.Series(False, index=df.index)
    for c in df.columns:
        if textlike(df[c]):
            mask |= df[c].astype(str).str.match(r"^\s*(grand\s+)?(sub\s*)?total\b", case=False)
    if mask.any():
        log.append(f"Removed {int(mask.sum())} total/sub-total row(s) so numbers are not double counted.")
        df = df[~mask].reset_index(drop=True)
        df = df.dropna(axis=1, how="all")
    # source-specific column mapping
    source = importers.detect_source(df.columns) if source_type in ("auto", "", None) else source_type
    df, notes = importers.rename_columns(df, source)
    log.extend(notes)
    if source != "generic":
        log.insert(0, f"Detected a {source.upper()} style export.")
    df = _convert_types(df, log)
    df, notes = importers.add_derived(df, source)
    log.extend(notes)
    before = len(df)
    df = df.drop_duplicates().reset_index(drop=True)
    if len(df) < before:
        log.append(f"Removed {before - len(df)} exact duplicate row(s).")
    if df.empty:
        raise ValueError("No usable rows were found after cleaning.")
    roles = infer_roles(df)
    if "amount" not in roles:
        log.append("Warning: no numeric amount column was found, so most analyses cannot run.")
    profile, overview = build_profile(df, roles)
    return ProcessResult(df=df, roles=roles, profile=profile, overview=overview, log=log, source=source)
