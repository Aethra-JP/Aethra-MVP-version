"""Best-effort mappers for Tally and GST exports.

Column names are matched after normalisation (lower_snake_case). Real exports vary by version and
settings, so always test with a real export from the customer and extend the maps below.
"""
import numpy as np
import pandas as pd

GST_TAX_COLS = ["integrated_tax", "central_tax", "state_ut_tax", "state_tax", "cess", "igst", "cgst", "sgst"]


def detect_source(columns) -> str:
    c = set(columns)
    if "taxable_value" in c and any("gstin" in x for x in c):
        return "gst"
    if "voucher_type" in c or "vch_type" in c or ("particulars" in c and ({"debit", "credit", "gross_total"} & c)):
        return "tally"
    return "generic"


def rename_columns(df: pd.DataFrame, source: str):
    """Run BEFORE type conversion. Returns (df, notes)."""
    notes = []
    pairs = []
    if source == "gst":
        pairs = [("invoice_date", "date"), ("taxable_value", "amount"), ("receiver_name", "customer"),
                 ("customer_name", "customer"), ("invoice_number", "invoice_no"), ("rate", "tax_rate")]
    elif source == "tally":
        pairs = [("particulars", "customer"), ("vch_type", "voucher_type"), ("vch_no", "voucher_no")]
    ren = {}
    for src, dst in pairs:
        if src in df.columns and dst not in df.columns and dst not in ren.values():
            ren[src] = dst
    if ren:
        df = df.rename(columns=ren)
        notes.append("Mapped columns for " + source.upper() + ": " + ", ".join(f"{a} -> {b}" for a, b in ren.items()))
    return df, notes


def add_derived(df: pd.DataFrame, source: str):
    """Run AFTER type conversion. Returns (df, notes)."""
    notes = []
    if source == "gst":
        taxes = [c for c in GST_TAX_COLS if c in df.columns and pd.api.types.is_numeric_dtype(df[c])]
        if taxes and "total_tax" not in df.columns:
            df["total_tax"] = df[taxes].fillna(0).sum(axis=1)
            notes.append("Added total_tax = " + " + ".join(taxes))
    elif source == "tally" and "amount" not in df.columns:
        num = lambda c: c in df.columns and pd.api.types.is_numeric_dtype(df[c])
        if num("gross_total"):
            df["amount"] = df["gross_total"]
            notes.append("Used gross_total as amount")
        elif num("debit") and num("credit"):
            d, c = df["debit"].fillna(0), df["credit"].fillna(0)
            df["amount"] = d + c
            df["entry_type"] = np.where(d > 0, "Debit", np.where(c > 0, "Credit", None))
            notes.append("Built amount = debit + credit and added entry_type (Debit/Credit)")
        elif num("debit"):
            df["amount"] = df["debit"]
            notes.append("Used debit as amount")
        elif num("credit"):
            df["amount"] = df["credit"]
            notes.append("Used credit as amount")
    return df, notes
