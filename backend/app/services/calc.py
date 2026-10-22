"""Calculation engine + audit log.

Rule of the product: Python computes every number; the LLM only explains numbers it is given.
Each computed value is recorded with its formula, source columns and filters so the UI can show
a 'How was this calculated?' view.
"""
from dataclasses import dataclass, field, asdict
from typing import Any

from .util import jsonable


def fmt_inr(x) -> str:
    if x is None:
        return "n/a"
    sign = "-" if x < 0 else ""
    x = abs(float(x))
    if x >= 1e7:
        return f"{sign}₹{x / 1e7:.2f} crore"
    if x >= 1e5:
        return f"{sign}₹{x / 1e5:.2f} lakh"
    return f"{sign}₹{x:,.0f}"


@dataclass
class CalcRecord:
    id: str
    label: str
    value: Any
    formula: str
    source_columns: list = field(default_factory=list)
    filters: dict = field(default_factory=dict)

    def dict(self):
        return jsonable(asdict(self))


class CalcLog:
    def __init__(self, prefix: str = "c"):
        self.records: list[CalcRecord] = []
        self.prefix = prefix

    def add(self, label, value, formula, source_columns=(), filters=None) -> CalcRecord:
        if isinstance(value, float):
            value = round(value, 2)
        rec = CalcRecord(f"{self.prefix}{len(self.records) + 1}", label, jsonable(value), formula,
                         list(source_columns), filters or {})
        self.records.append(rec)
        return rec

    def as_list(self):
        return [r.dict() for r in self.records]
