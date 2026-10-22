import io

import pandas as pd
import pytest

from app.services import processor


def test_messy_csv(processed):
    r = processed
    assert r.roles["amount"] == "amount" and r.roles["date"] == "date"
    assert pd.api.types.is_numeric_dtype(r.df["amount"])
    assert pd.api.types.is_datetime64_any_dtype(r.df["date"])
    assert len(r.df) == 2639  # total row and title rows removed
    assert r.df["date"].min() == pd.Timestamp("2024-04-01")  # day-first parsing
    assert any("title row" in x for x in r.log) and any("total" in x.lower() for x in r.log)


def test_indian_number_styles():
    csv = "Item,Amount,Date\nA,\"Rs. 1,23,456.50\",01/02/2025\nB,\"(2,000)\",02/02/2025\nC,\"₹ 9,999\",03/02/2025\n"
    r = processor.process(csv.encode(), "x.csv")
    assert r.df["amount"].tolist() == [123456.5, -2000.0, 9999.0]
    assert r.df["date"].dt.month.tolist() == [2, 2, 2]


def test_excel_with_title_rows_and_serial_dates():
    df = pd.DataFrame([["Shop report", None, None], [None, None, None], ["Date", "Product", "Sales"],
                       [45000, "Tea", 100], [45001, "Tea", 150], [45002, "Coffee", 90]])
    buf = io.BytesIO()
    df.to_excel(buf, header=False, index=False)
    r = processor.process(buf.getvalue(), "r.xlsx")
    assert r.roles.get("amount") == "sales" and pd.api.types.is_datetime64_any_dtype(r.df["date"])
    assert r.df["date"].min().year == 2023


def test_semicolon_and_cp1252():
    csv = "Date;Item;Amount\n01/01/2025;Caf\xe9;100\n02/01/2025;Tea;200\n".encode("cp1252")
    r = processor.process(csv, "x.csv")
    assert r.df["amount"].sum() == 300


def test_duplicates_and_repeated_headers():
    csv = "Date,Item,Amount\n01/01/2025,A,10\n01/01/2025,A,10\nDate,Item,Amount\n02/01/2025,B,20\n"
    r = processor.process(csv.encode(), "x.csv")
    assert len(r.df) == 2


def test_tally_export():
    csv = ("Day Book\nParticulars,Date,Voucher Type,Voucher No.,Debit,Credit\n"
           "Sharma Traders,01-Apr-2025,Sales,1,\"12,500.00\",\nGupta Stores,02-Apr-2025,Sales,2,\"8,200.00\",\n")
    r = processor.process(csv.encode(), "tally.csv")
    assert r.source == "tally" and r.roles["amount"] == "amount" and r.df["amount"].sum() == 20700
    assert "customer" in r.df.columns


def test_gst_export():
    csv = ("GSTIN/UIN of Recipient,Receiver Name,Invoice Number,Invoice date,Invoice Value,Rate,Taxable Value,Integrated Tax,Central Tax,State/UT Tax,Cess\n"
           "27AAAAA0000A1Z5,ABC Ltd,INV1,05/04/2025,\"11,800.00\",18,\"10,000.00\",,900,900,\n"
           "29BBBBB1111B1Z5,XYZ Ltd,INV2,06/04/2025,\"5,900.00\",18,\"5,000.00\",900,,,\n")
    r = processor.process(csv.encode(), "gst.csv")
    assert r.source == "gst" and r.roles["amount"] == "amount" and r.df["amount"].sum() == 15000
    assert "total_tax" in r.df.columns and r.df["total_tax"].sum() == 2700


def test_unreadable_inputs():
    with pytest.raises(ValueError):
        processor.process(b"", "x.csv")
    with pytest.raises(ValueError):
        processor.process(b"abc", "old.xls")
