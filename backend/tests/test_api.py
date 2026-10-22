import json

from app import llm


def _setup(api, sample_bytes):
    ws = api.post("/api/workspaces", json={"name": "Shree Ganesh Traders", "business_type": "retail"}).json()
    path = f"{ws['id']}/sample.csv"
    api.fake.files[("datasets", path)] = sample_bytes
    reg = api.post("/api/datasets/register", json={"workspace_id": ws["id"], "name": "FY sales", "storage_path": path,
                                                    "period_label": "Apr 2024 - Sep 2026"})
    assert reg.status_code == 200, reg.text
    return ws, reg.json()


def test_requires_login():
    from fastapi.testclient import TestClient
    from app.main import app
    assert TestClient(app).get("/api/workspaces").status_code == 401
    assert TestClient(app).get("/api/health").json()["ok"] is True


def test_full_flow(api, sample_bytes, monkeypatch):
    ws, reg = _setup(api, sample_bytes)
    ds = reg["dataset"]
    assert reg["overview"]["rows"] == 2639 and reg["roles"]["amount"] == "amount"
    assert api.get(f"/api/datasets?workspace_id={ws['id']}").json()[0]["id"] == ds["id"]
    # on-demand analyses
    for kind in ("descriptive", "diagnostic", "prescriptive"):
        r = api.post("/api/analyses", json={"dataset_id": ds["id"], "kind": kind})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["analysis"]["narrative"] and body["calculations"]
    acts = api.get(f"/api/actions?workspace_id={ws['id']}").json()
    assert acts
    assert api.patch(f"/api/actions/{acts[0]['id']}", json={"status": "in_progress"}).json()["status"] == "in_progress"
    chk = api.post(f"/api/actions/{acts[0]['id']}/check")
    assert chk.status_code == 200 and chk.json()["outcome"]["change_pct"] == 0
    # forecasting: pick a model, then compare
    models = api.get(f"/api/predict/models?dataset_id={ds['id']}").json()
    assert any(m["name"] == "holt_winters" and m["available"] for m in models["models"])
    run = api.post("/api/predict/run", json={"dataset_id": ds["id"], "model": "naive", "horizon": 6})
    assert run.status_code == 200 and len(run.json()["forecast"]) == 6
    cmp = api.post("/api/predict/compare", json={"model_run_id": run.json()["run"]["id"]}).json()
    assert cmp["recommended"] and cmp["verdict"]
    # chat
    monkeypatch.setattr(llm, "configured", lambda: True)
    state = {"n": 0}

    def fake_chat(messages, tools=None, **kw):
        state["n"] += 1
        if tools and state["n"] % 2 == 1:
            return {"content": "", "tool_calls": [{"id": "1", "type": "function", "function": {
                "name": "query_data", "arguments": json.dumps({"operation": "sum", "column": "amount"})}}]}
        return {"content": "Your total is in the tool result."}

    monkeypatch.setattr(llm, "chat", fake_chat)
    c = api.post("/api/chat", json={"workspace_id": ws["id"], "dataset_id": ds["id"], "message": "What are my total sales?"})
    assert c.status_code == 200, c.text
    sid = c.json()["session_id"]
    msgs = api.get(f"/api/chat/sessions/{sid}/messages").json()
    assert [m["role"] for m in msgs] == ["user", "assistant"]
    assert api.get(f"/api/chat/sessions?workspace_id={ws['id']}").json()[0]["id"] == sid
    # documents are off until embeddings are configured
    assert api.get("/api/knowledge/status").json()["embeddings_enabled"] is False
    doc = api.post("/api/documents/register", json={"workspace_id": ws["id"], "name": "terms.txt", "storage_path": f"{ws['id']}/terms.txt"}).json()
    assert api.post(f"/api/documents/{doc['id']}/ingest").status_code == 503
    # scheduled digest + alerts
    assert api.post("/api/cron/run", headers={"x-cron-secret": "wrong"}).status_code == 401
    assert api.post("/api/cron/run", headers={"x-cron-secret": "s3cret"}).json()["ok"] is True
    assert api.get(f"/api/alerts?workspace_id={ws['id']}").json()


def test_security_and_limits(api, sample_bytes, monkeypatch):
    ws, reg = _setup(api, sample_bytes)
    other = api.post("/api/datasets/register", json={"workspace_id": ws["id"], "name": "x", "storage_path": "someone-else/file.csv"})
    assert other.status_code == 400
    api.fake.tables["workspace_members"].clear()  # user is no longer a member
    assert api.get(f"/api/datasets?workspace_id={ws['id']}").status_code == 403
    api.post("/api/workspaces", json={"name": "again"})
    monkeypatch.setenv("MAX_ANALYSES_PER_DAY", "2")
    ws2 = api.get("/api/workspaces").json()[0]
    path = f"{ws2['id']}/s.csv"
    api.fake.files[("datasets", path)] = sample_bytes
    ds = api.post("/api/datasets/register", json={"workspace_id": ws2["id"], "name": "d", "storage_path": path}).json()["dataset"]
    codes = [api.post("/api/analyses", json={"dataset_id": ds["id"], "kind": "descriptive"}).status_code for _ in range(3)]
    assert codes == [200, 200, 429]


def test_bad_file_gives_friendly_error(api):
    ws = api.post("/api/workspaces", json={"name": "T"}).json()
    path = f"{ws['id']}/empty.csv"
    api.fake.files[("datasets", path)] = b""
    r = api.post("/api/datasets/register", json={"workspace_id": ws["id"], "name": "e", "storage_path": path})
    assert r.status_code == 422 and r.json()["detail"]
