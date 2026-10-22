"""Descriptive, diagnostic and prescriptive analysis. Pure pandas; every figure goes through CalcLog."""
import numpy as np
import pandas as pd

from .calc import CalcLog, fmt_inr

NO_AMOUNT = ("No amount/sales column was found in this file, so this analysis cannot run. "
             "Check that the file has a numeric column such as Amount, Sales or Revenue.")
DIMS = ("product", "category", "customer")
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _need(roles):
    m = roles.get("amount")
    if not m:
        raise ValueError(NO_AMOUNT)
    return m, roles.get("date")


def _monthly(df, d, m):
    return df.dropna(subset=[d]).set_index(d)[m].resample("MS").sum()


def _split_partial(df, d, series):
    """Return (complete_months_series, last_month_is_partial)."""
    if len(series) < 2:
        return series, False
    end = series.index[-1] + pd.offsets.MonthEnd(0)
    partial = df[d].max().normalize() < end.normalize()
    return (series.iloc[:-1] if partial else series), bool(partial)


def descriptive(df, roles, log: CalcLog, prev=None):
    m, d = _need(roles)
    kpis, notes = [], []
    rec = log.add(f"Total {m}", float(df[m].sum()), f"sum({m})", [m])
    total = rec.value
    kpis.append({"label": f"Total {m}", "value": total, "unit": "inr", "calc": rec.id})
    r2 = log.add("Number of records", int(len(df)), "count of rows")
    kpis.append({"label": "Records", "value": r2.value, "unit": "count", "calc": r2.id})
    r3 = log.add(f"Average {m} per record", float(df[m].mean()), f"mean({m})", [m])
    kpis.append({"label": f"Average per record", "value": r3.value, "unit": "inr", "calc": r3.id})
    result = {"measure": m, "total": total, "records": r2.value, "average": r3.value, "kpis": kpis,
              "trend": [], "breakdowns": {}, "notes": notes}
    if d:
        ms = _monthly(df, d, m)
        trend = [{"period": i.strftime("%Y-%m"), "value": round(float(v), 2)} for i, v in ms.items()]
        log.add("Monthly totals", trend, f"sum({m}) grouped by month of {d}", [m, d])
        result["trend"] = trend
        comp, partial = _split_partial(df, d, ms)
        if partial:
            notes.append(f"The last month ({ms.index[-1].strftime('%b %Y')}) is incomplete, so it is left out of growth figures.")
        if len(comp) >= 1:
            b, w = comp.idxmax(), comp.idxmin()
            rb = log.add("Best month", {"period": b.strftime("%Y-%m"), "value": float(comp[b])}, f"max of monthly sum({m})", [m, d])
            rw = log.add("Weakest month", {"period": w.strftime("%Y-%m"), "value": float(comp[w])}, f"min of monthly sum({m})", [m, d])
            result["best_month"], result["weakest_month"] = rb.value, rw.value
        if len(comp) >= 2 and comp.iloc[-2] != 0:
            g = (comp.iloc[-1] - comp.iloc[-2]) / abs(comp.iloc[-2]) * 100
            rg = log.add("Month-over-month growth %", float(g),
                         "(last complete month - previous month) / previous month * 100", [m, d])
            result["mom_growth_pct"] = rg.value
            result["growth_periods"] = [comp.index[-2].strftime("%Y-%m"), comp.index[-1].strftime("%Y-%m")]
            kpis.append({"label": "Growth vs previous month", "value": rg.value, "unit": "pct", "calc": rg.id})
        if len(comp) >= 13:
            last = comp.index[-1]
            ly = last - pd.DateOffset(years=1)
            if ly in comp.index and comp[ly] != 0:
                yoy = (comp[last] - comp[ly]) / abs(comp[ly]) * 100
                ry = log.add("Year-over-year growth %", float(yoy),
                             "(last complete month - same month last year) / same month last year * 100", [m, d])
                result["yoy_growth_pct"] = ry.value
                kpis.append({"label": "Growth vs same month last year", "value": ry.value, "unit": "pct", "calc": ry.id})
    if prev and prev.get("total"):
        ch = (total - prev["total"]) / abs(prev["total"]) * 100
        rp = log.add("Change vs previous upload %", float(ch), "(this upload total - previous upload total) / previous upload total * 100", [m])
        result["change_vs_previous_upload_pct"] = rp.value
        kpis.append({"label": "Change vs previous upload", "value": rp.value, "unit": "pct", "calc": rp.id})
    for dim in DIMS:
        col = roles.get(dim)
        if not col or df[col].nunique() < 2:
            continue
        g = df.groupby(col)[m].sum().sort_values(ascending=False)
        top = [{"name": str(k), "value": round(float(v), 2), "share_pct": round(float(v) / total * 100, 1) if total else 0.0}
               for k, v in g.head(5).items()]
        log.add(f"Top {dim}s by {m}", top, f"sum({m}) grouped by {col}, top 5", [m, col])
        result["breakdowns"][dim] = top
        if len(g) >= 4 and total:
            rs = log.add(f"Share of top 3 {dim}s %", float(g.head(3).sum() / total * 100),
                         f"sum of top 3 {dim}s / total * 100", [m, col])
            result.setdefault("concentration", {})[dim] = rs.value
        result.setdefault("distinct", {})[dim] = int(len(g))
    return result


def diagnostic(df, roles, log: CalcLog):
    m, d = _need(roles)
    out = {"measure": m, "drivers": None, "anomalies": [], "weekday": None, "correlations": [], "margin": None, "notes": []}
    if d:
        dfm = df.dropna(subset=[d]).copy()
        dfm["_p"] = dfm[d].dt.to_period("M").dt.to_timestamp()
        ms = dfm.groupby("_p")[m].sum()
        comp, partial = _split_partial(df, d, ms)
        if partial:
            out["notes"].append("The last month is incomplete and is left out of the comparison.")
        if len(comp) >= 2:
            cur, prv = comp.index[-1], comp.index[-2]
            delta = float(comp[cur] - comp[prv])
            rd = log.add("Change between last two complete months", delta, "sum in last month - sum in previous month", [m, d])
            drivers = {"from": prv.strftime("%Y-%m"), "to": cur.strftime("%Y-%m"), "delta": rd.value, "up": [], "down": []}
            dim = next((x for x in ("category", "product", "customer") if roles.get(x) and df[roles[x]].nunique() > 1), None)
            if dim:
                col = roles[dim]
                piv = dfm[dfm["_p"].isin([prv, cur])].groupby([col, "_p"])[m].sum().unstack(fill_value=0)
                for c in (prv, cur):
                    if c not in piv.columns:
                        piv[c] = 0.0
                dl = (piv[cur] - piv[prv]).sort_values()
                drivers["dimension"] = dim
                for k, v in dl.tail(3)[::-1].items():
                    if v > 0:
                        drivers["up"].append({"name": str(k), "delta": round(float(v), 2)})
                for k, v in dl.head(3).items():
                    if v < 0:
                        drivers["down"].append({"name": str(k), "delta": round(float(v), 2)})
                log.add(f"Biggest {dim} movers", {"up": drivers["up"], "down": drivers["down"]},
                        f"change in sum({m}) per {col} between the two months", [m, col, d])
            out["drivers"] = drivers
        daily = df.dropna(subset=[d]).groupby(df[d].dt.normalize())[m].sum()
        if len(daily) >= 14:
            med = float(daily.median())
            mad = float((daily - med).abs().median())
            if mad > 0:
                z = 0.6745 * (daily - med) / mad
                flagged = z[z.abs() > 3.5].abs().sort_values(ascending=False).head(5)
                an = [{"date": i.strftime("%Y-%m-%d"), "value": round(float(daily[i]), 2),
                       "direction": "high" if z[i] > 0 else "low"} for i in flagged.index]
                log.add("Unusual days", an, "robust z-score = 0.6745*(x - median)/MAD; flagged if |z| > 3.5 (daily totals)", [m, d])
                out["anomalies"] = an
            wd = daily.groupby(daily.index.dayofweek).mean()
            if len(wd) >= 5:
                wl = [{"day": WEEKDAYS[int(i)], "average": round(float(v), 2)} for i, v in wd.items()]
                rwd = log.add("Average daily total by weekday", wl, f"mean of daily sum({m}) per weekday", [m, d])
                out["weekday"] = {"values": rwd.value, "best": max(wl, key=lambda x: x["average"]),
                                  "worst": min(wl, key=lambda x: x["average"])}
    nums = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c]) and df[c].nunique() > 2][:8]
    if len(nums) >= 2 and len(df) >= 10:
        cm = df[nums].corr()
        pairs = []
        for i, a in enumerate(nums):
            for b in nums[i + 1:]:
                r = cm.loc[a, b]
                if pd.notna(r) and 0.5 <= abs(r) < 0.999:
                    pairs.append({"a": a, "b": b, "r": round(float(r), 2)})
        pairs = sorted(pairs, key=lambda x: -abs(x["r"]))[:3]
        if pairs:
            log.add("Strong relationships between columns", pairs, "Pearson correlation, shown when |r| >= 0.5", [p["a"] for p in pairs])
            out["correlations"] = pairs
    c = roles.get("cost")
    if c and df[c].notna().any():
        tot, cost = float(df[m].sum()), float(df[c].sum())
        if tot:
            mg = log.add("Overall margin %", (tot - cost) / tot * 100, f"(sum({m}) - sum({c})) / sum({m}) * 100", [m, c])
            out["margin"] = {"overall_pct": mg.value, "negative_items": []}
            p = roles.get("product")
            if p:
                g = df.groupby(p)[[m, c]].sum()
                g["profit"] = g[m] - g[c]
                neg = g[g["profit"] < 0].sort_values("profit").head(3)
                items = [{"name": str(k), "profit": round(float(v), 2)} for k, v in neg["profit"].items()]
                if items:
                    log.add("Loss-making products", items, f"sum({m}) - sum({c}) per product, negative only", [m, c, p])
                    out["margin"]["negative_items"] = items
    return out


def _priority(impact, total):
    if impact is None or not total:
        return "medium"
    share = abs(impact) / abs(total) * 100
    return "high" if share >= 5 else "medium" if share >= 1 else "low"


def prescriptive(df, roles, log: CalcLog, desc, diag, events=None, today=None):
    """Rule-based actions. Every ₹ figure is an estimate with its assumption written next to it."""
    m, d = _need(roles)
    total = desc["total"]
    today = pd.Timestamp(today or pd.Timestamp.today()).normalize()
    actions = []

    def add(title, detail, impact, impact_type, assumption, due_days, calc_ids):
        actions.append({"title": title, "detail": detail, "est_impact_inr": None if impact is None else round(float(impact), 2),
                        "impact_type": impact_type, "assumption": assumption, "due_in_days": due_days,
                        "priority": _priority(impact, total), "calc_ids": calc_ids,
                        "baseline": {"measure": m, "total": total}})

    for dim, share in (desc.get("concentration") or {}).items():
        if share >= 60 and desc.get("distinct", {}).get(dim, 0) > 3:
            exp = log.add(f"Revenue exposed if top {dim}s weaken", total * share / 100 * 0.10,
                          f"total * top-3 share ({share}%) * 10% assumed downside", [m])
            add(f"Reduce dependence on your top 3 {dim}s",
                f"Your top 3 {dim}s bring {share:.0f}% of {m}. Find 2-3 more {dim}s to grow so one slow month does not hurt badly.",
                exp.value, "risk", "Assumes a 10% fall in the top 3.", 30, [exp.id])
            break
    drv = diag.get("drivers") or {}
    for item in (drv.get("down") or [])[:2]:
        lost = abs(item["delta"])
        gain = log.add(f"Recoverable revenue from {item['name']}", lost * 0.5,
                       "50% of the drop between the last two months", [m])
        add(f"Find out why {item['name']} fell",
            f"{item['name']} dropped by {fmt_inr(lost)} between {drv['from']} and {drv['to']}. Check stock, pricing, or a lost buyer.",
            gain.value, "gain", "Assumes half of the drop can be recovered.", 14, [gain.id])
    wd = diag.get("weekday")
    if wd and wd["worst"]["average"] < 0.7 * (sum(x["average"] for x in wd["values"]) / len(wd["values"])):
        avg = sum(x["average"] for x in wd["values"]) / len(wd["values"])
        gap = avg - wd["worst"]["average"]
        g = log.add(f"Monthly gain from lifting {wd['worst']['day']}s", gap * 0.25 * 4.3,
                    "(average weekday - weakest weekday) * 25% lift * 4.3 weeks", [m, d] if d else [m])
        add(f"Run a small offer on {wd['worst']['day']}s",
            f"{wd['worst']['day']} is your weakest day. A simple offer or a message to regular customers could help.",
            g.value, "gain", "Assumes a 25% lift of the gap to the average day.", 21, [g.id])
    mg = diag.get("margin") or {}
    for it in (mg.get("negative_items") or [])[:2]:
        add(f"Review the price of {it['name']}",
            f"{it['name']} is making a loss of {fmt_inr(abs(it['profit']))} on the data uploaded. Revisit price or cost.",
            abs(it["profit"]), "gain", "Assumes the loss can be brought to break-even.", 14, [])
    if d and events:
        ms = _monthly(df, d, m)
        comp, _ = _split_partial(df, d, ms)
        horizon = {(today + pd.Timedelta(days=k)).month for k in range(0, 61)}
        for ev in events:
            evm = set(ev.get("months") or [])
            if not (evm & horizon):
                continue
            hist = comp[comp.index.month.isin(evm)]
            if len(comp) >= 13 and len(hist):
                uplift = (hist.mean() / comp.mean() - 1) * 100
                if uplift >= 15:
                    extra = (hist.mean() - comp.mean()) * 0.5
                    r = log.add(f"Expected extra sales in {ev['name']}", float(extra),
                                f"(average of {ev['name']} months - average of all months) * 50%", [m, d])
                    add(f"Stock up for {ev['name']}",
                        f"In past years your {ev['name']} months averaged {uplift:.0f}% above a normal month. Plan stock and staff early.",
                        r.value, "gain", "Assumes you capture half of the usual seasonal extra.", 30, [r.id])
                    continue
            add(f"Prepare for {ev['name']}",
                f"{ev['name']} falls in the next two months. Upload at least 13 months of data to see how much it usually lifts your sales.",
                None, "gain", "Not enough history to estimate.", 30, [])
    actions.sort(key=lambda a: (a["est_impact_inr"] is None, -(abs(a["est_impact_inr"]) if a["est_impact_inr"] else 0)))
    return {"actions": actions[:6]}
