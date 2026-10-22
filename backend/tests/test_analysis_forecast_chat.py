import json

import numpy as np
import pandas as pd
import pytest

from app.services import analysis, chat_agent, forecasting, narrative
from app.services.calc import CalcLog, fmt_inr


def test_fmt_inr():
    assert fmt_inr(1234567) == "₹12.35 lakh" and fmt_inr(25000000) == "₹2.50 crore" and fmt_inr(-4500) == "-₹4,500"


def test_descriptive_matches_pandas(processed):
    df, roles = processed.df, processed.roles
    log = CalcLog()
    r = analysis.descriptive(df, roles, log)
    assert r["total"] == round(float(df["amount"].sum()), 2)
    assert r["notes"] and "incomplete" in r["notes"][0]  # Sep 2026 is partial in the sample
    assert all(rec.formula for rec in log.records)
    ids = {k["calc"] for k in r["kpis"]}
    assert ids <= {rec.id for rec in log.records}


def test_diagnostic_and_prescriptive(processed):
    df, roles = processed.df, processed.roles
    log = CalcLog()
    d = analysis.descriptive(df, roles, log)
    g = analysis.diagnostic(df, roles, log)
    assert g["drivers"] and g["weekday"]
    p = analysis.prescriptive(df, roles, log, d, g, [{"name": "Diwali", "months": [10, 11]}], today="2026-10-20")
    assert any("Diwali" in a["title"] for a in p["actions"])
    for a in p["actions"]:
        assert a["assumption"] and a["priority"] in ("high", "medium", "low")


def test_no_amount_column_gives_clear_error():
    df = pd.DataFrame({"name": ["a", "b"]})
    with pytest.raises(ValueError, match="No amount"):
        analysis.descriptive(df, {}, CalcLog())


def test_narrative_number_guard():
    result = {"total": 2839520.0, "mom_growth_pct": 15.8}
    assert narrative.verify_numbers("Total is ₹28.40 lakh, up 15.8%.", result)
    assert not narrative.verify_numbers("Total is ₹31.00 lakh, up 15.8%.", result)
    # a hallucinated number makes narrate() fall back to the template
    fake = lambda m, t: {"content": "Sales are ₹91.00 lakh."}
    text, src = narrative.narrate("descriptive", {"measure": "amount", "total": 2839520.0, "records": 10, "breakdowns": {}, "notes": []}, "en", fake)
    assert src == "template" and "28.40 lakh" in text


def _series(n=48, seed=0):
    rng = np.random.default_rng(seed)
    idx = pd.date_range("2022-01-01", periods=n, freq="MS")
    y = 1000 + np.arange(n) * 8 + 400 * np.sin(2 * np.pi * (np.asarray(idx.month) - 1) / 12) + rng.normal(0, 25, n)
    return y, idx


def test_seasonal_data_prefers_seasonal_models():
    y, idx = _series()
    res = forecasting.compare(y, idx, 6, "monthly", user_model="naive")
    assert res["recommended"] not in ("naive", "moving_average", "drift")
    assert "lower error" in res["verdict"]


def test_short_history_is_flagged_and_restricted():
    y, idx = _series(10)
    models = {m["name"]: m for m in forecasting.list_models(10, "monthly")}
    assert not models["seasonal_naive"]["available"] and models["naive"]["available"]
    res = forecasting.compare(y, idx, 3, "monthly")
    assert res["warnings"]


def test_forecast_shape_and_non_negative():
    y, idx = _series()
    out = forecasting.run_model("holt_winters", y, idx, 6, "monthly")
    assert len(out["forecast"]) == 6 and out["forecast"][0]["period"] == "2026-01-01"
    assert all(f["value"] >= 0 for f in out["forecast"])
    assert out["backtest"]["folds"] >= 1


def test_chat_agent_tool_loop_and_errors(processed):
    calls = {"n": 0}

    def fake(messages, tools):
        calls["n"] += 1
        if calls["n"] == 1:
            tc = lambda i, n, a: {"id": i, "type": "function", "function": {"name": n, "arguments": json.dumps(a)}}
            return {"content": "", "tool_calls": [
                tc("1", "query_data", {"operation": "sum", "column": "amount", "group_by": "category"}),
                tc("2", "build_chart", {"kind": "bar", "x": "category", "y": "amount"}),
                tc("3", "run_forecast", {"horizon": 3, "model": "seasonal_naive"}),
                tc("4", "query_data", {"operation": "sum", "column": "does_not_exist"}),
                tc("5", "search_documents", {"query": "terms"})]}
        tool_msgs = [m for m in messages if m["role"] == "tool"]
        assert len(tool_msgs) == 5 and "error" in tool_msgs[3]["content"]
        return {"content": "Sweets lead."}

    out = chat_agent.run_agent(processed.df, processed.roles, [], "which category sells most?", llm_chat=fake)
    assert out["answer"] == "Sweets lead." and len(out["charts"]) == 2
    assert [t["ok"] for t in out["trace"]] == [True, True, True, False, False]  # last one: document search is not enabled
    total = sum(x["value"] for x in out["calculations"][0]["value"])
    assert round(total, 2) == round(float(processed.df["amount"].sum()), 2)


def test_filters(processed):
    ctx = chat_agent.Ctx(processed.df, processed.roles)
    r = chat_agent.t_query_data(ctx, "sum", "amount", filters=[{"column": "category", "op": "==", "value": "sweets"}],
                                date_from="2025-01-01", date_to="2025-12-31")
    d = processed.df
    exp = d[(d.category == "Sweets") & (d.date >= "2025-01-01") & (d.date < "2026-01-01")]["amount"].sum()
    assert r["result"] == round(float(exp), 2)


def test_change_vs_previous_upload(processed):
    log = CalcLog()
    r = analysis.descriptive(processed.df, processed.roles, log, prev={"total": processed.overview["total"] / 2})
    assert r["change_vs_previous_upload_pct"] == 100.0
    assert "previous upload" in narrative.template_narrative("descriptive", r)
    assert any(k["label"] == "Change vs previous upload" for k in r["kpis"])
