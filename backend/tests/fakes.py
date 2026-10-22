"""A tiny in-memory stand-in for the parts of supabase-py that Aethra uses (for offline tests)."""
import uuid
from datetime import datetime, timezone


class Res:
    def __init__(self, data, count=None):
        self.data, self.count = data, count


class Query:
    def __init__(self, store, table):
        self.s, self.t = store, table
        self.filters, self.op, self.payload = [], "select", None
        self._order, self._limit, self._count = None, None, False

    def select(self, cols="*", count=None):
        self.op, self._count = "select", count == "exact"
        return self

    def insert(self, rows):
        self.op, self.payload = "insert", rows
        return self

    def update(self, d):
        self.op, self.payload = "update", d
        return self

    def delete(self):
        self.op = "delete"
        return self

    def eq(self, k, v):
        self.filters.append(lambda r: r.get(k) == v)
        return self

    def in_(self, k, vs):
        self.filters.append(lambda r: r.get(k) in vs)
        return self

    def gte(self, k, v):
        self.filters.append(lambda r: r.get(k) is not None and r.get(k) >= v)
        return self

    def order(self, k, desc=False):
        self._order = (k, desc)
        return self

    def limit(self, n):
        self._limit = n
        return self

    def execute(self):
        rows = self.s.tables.setdefault(self.t, [])
        if self.op == "insert":
            items = self.payload if isinstance(self.payload, list) else [self.payload]
            out = []
            for it in items:
                r = dict(it)
                r.setdefault("id", str(uuid.uuid4()))
                r.setdefault("created_at", datetime.now(timezone.utc).isoformat())
                rows.append(r)
                out.append(dict(r))
            return Res(out)
        sel = [r for r in rows if all(f(r) for f in self.filters)]
        if self.op == "update":
            for r in sel:
                r.update(self.payload)
            return Res([dict(r) for r in sel])
        if self.op == "delete":
            for r in sel:
                rows.remove(r)
            return Res([])
        if self._order:
            k, desc = self._order
            sel.sort(key=lambda r: "" if r.get(k) is None else r.get(k), reverse=desc)
        n = len(sel)
        if self._limit:
            sel = sel[: self._limit]
        return Res([dict(r) for r in sel], n if self._count else None)


class Bucket:
    def __init__(self, store, name):
        self.s, self.n = store, name

    def download(self, path):
        return self.s.files[(self.n, path)]

    def upload(self, path, data, opts=None):
        self.s.files[(self.n, path)] = data


class Storage:
    def __init__(self, store):
        self.s = store

    def from_(self, name):
        return Bucket(self.s, name)


class FakeSB:
    def __init__(self):
        self.tables, self.files = {}, {}
        self.storage = Storage(self)

    def table(self, name):
        return Query(self, name)

    def rpc(self, name, params):
        class _R:
            def execute(self_inner):
                return Res([])
        return _R()
