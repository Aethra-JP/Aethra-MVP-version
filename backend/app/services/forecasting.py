"""Forecast model menu, time-aware backtesting and a 'best model for your data' recommendation.

Lite models are pure numpy so they fit serverless size limits. scikit-learn / statsmodels models
appear automatically when those packages are installed (requirements-full.txt).
"""
import time
import warnings

import numpy as np
import pandas as pd

FREQ = {"monthly": ("MS", 12), "weekly": ("W", 52), "daily": ("D", 7)}
LAGS = {"monthly": 3, "weekly": 4, "daily": 7}


def aggregate_series(df, date_col, value_col, freq="monthly"):
    f, _ = FREQ[freq]
    s = df.dropna(subset=[date_col]).set_index(date_col)[value_col].resample(f).sum()
    last = df[date_col].max().normalize()
    end = s.index[-1] + pd.offsets.MonthEnd(0) if freq == "monthly" else s.index[-1]
    if last < end.normalize() and len(s) > 1:
        s = s.iloc[:-1]  # drop the incomplete final period
    return s.astype(float)


def future_index(idx, h, freq):
    return pd.date_range(idx[-1], periods=h + 1, freq=FREQ[freq][0])[1:]


def _season(idx, freq):
    if freq == "monthly":
        return np.asarray(idx.month) - 1, 12
    if freq == "daily":
        return np.asarray(idx.dayofweek), 7
    return None, 0


# ---------------- lite models (numpy only) ----------------
def m_naive(y, idx, h, m, freq):
    return np.repeat(y[-1], h)


def m_moving_avg(y, idx, h, m, freq):
    k = min(len(y), 3 if freq == "monthly" else 7)
    return np.repeat(y[-k:].mean(), h)


def m_drift(y, idx, h, m, freq):
    slope = (y[-1] - y[0]) / max(len(y) - 1, 1)
    return y[-1] + slope * np.arange(1, h + 1)


def m_seasonal_naive(y, idx, h, m, freq):
    return np.array([y[-m + (i % m)] for i in range(h)])


def m_linear_seasonal(y, idx, h, m, freq):
    n = len(y)
    use_season = n >= 2 * m and freq != "weekly"
    fidx = future_index(idx, h, freq)

    def design(ix, t):
        cols = [np.ones(len(t)), t.astype(float)]
        if use_season:
            k, size = _season(ix, freq)
            cols += [(k == j).astype(float) for j in range(1, size)]
        return np.column_stack(cols)

    X = design(idx, np.arange(n))
    w, *_ = np.linalg.lstsq(X, y, rcond=None)
    return design(fidx, np.arange(n, n + h)) @ w


def _hw_run(y, m, a, b, g, seasonal):
    n = len(y)
    if seasonal:
        level = y[:m].mean()
        trend = (y[m:2 * m].mean() - y[:m].mean()) / m
        season = list(y[:m] - level)
    else:
        level, trend, season = y[0], (y[1] - y[0]), None
    sse = 0.0
    for t in range(n):
        s_t = season[t % m] if seasonal else 0.0
        pred = level + trend + s_t
        if t >= (m if seasonal else 1):
            sse += (y[t] - pred) ** 2
        new_level = a * (y[t] - s_t) + (1 - a) * (level + trend)
        trend = b * (new_level - level) + (1 - b) * trend
        if seasonal:
            season[t % m] = g * (y[t] - new_level) + (1 - g) * season[t % m]
        level = new_level
    return sse, level, trend, season


def m_holt_winters(y, idx, h, m, freq):
    n = len(y)
    seasonal = n >= 2 * m
    best = None
    for a in (0.1, 0.3, 0.5, 0.8):
        for b in (0.01, 0.1, 0.3):
            for g in ((0.1, 0.3, 0.6) if seasonal else (0.0,)):
                sse, lvl, tr, se = _hw_run(y, m, a, b, g, seasonal)
                if best is None or sse < best[0]:
                    best = (sse, lvl, tr, se)
    _, lvl, tr, se = best
    phi = 0.95  # damped trend keeps long forecasts sensible
    out = []
    for i in range(1, h + 1):
        damp = sum(phi ** k for k in range(1, i + 1))
        v = lvl + damp * tr + (se[(n + i - 1) % m] if seasonal else 0.0)
        out.append(v)
    return np.array(out)


def _lag_features(hist, ix_t, p, scale, freq, use_season=True):
    lags = list(hist[-p:][::-1] / scale)
    k, size = _season(pd.DatetimeIndex([ix_t]), freq)
    dummies = [1.0 if k[0] == j else 0.0 for j in range(1, size)] if (size and use_season) else []
    return lags + dummies


def _fit_predict_lags(y, idx, h, freq, make_model):
    n = len(y)
    _, size = _season(idx[:1], freq)
    use_season = bool(size) and n >= 2 * size   # month/weekday effects need two full cycles, or they just memorise
    p = min(LAGS[freq], max(1, n // 4))
    scale = max(float(np.mean(np.abs(y))), 1.0)
    X, t = [], []
    for i in range(p, n):
        X.append(_lag_features(y[:i], idx[i], p, scale, freq, use_season))
        t.append(y[i] / scale)
    model = make_model()
    model.fit(np.array(X), np.array(t))
    nonneg, cap = bool((y >= 0).all()), 2.0 * float(np.max(y))
    hist = list(y)
    fidx = future_index(idx, h, freq)
    out = []
    for i in range(h):
        pred = float(model.predict(np.array([_lag_features(np.array(hist), fidx[i], p, scale, freq, use_season)]))[0]) * scale
        if nonneg:
            pred = min(max(pred, 0.0), cap)   # keep recursive forecasts realistic so errors cannot snowball
        out.append(pred)
        hist.append(pred)
    return np.array(out)


class _Ridge:
    def __init__(self, alpha=1.0):
        self.alpha = alpha

    def fit(self, X, y):
        A = np.column_stack([np.ones(len(X)), X])
        P = np.eye(A.shape[1]) * self.alpha
        P[0, 0] = 0.0
        self.w = np.linalg.solve(A.T @ A + P, A.T @ y)
        return self

    def predict(self, X):
        return np.column_stack([np.ones(len(X)), X]) @ self.w


def m_ridge_lags(y, idx, h, m, freq):
    return _fit_predict_lags(y, idx, h, freq, lambda: _Ridge(1.0))


# ---------------- optional models ----------------
def m_random_forest(y, idx, h, m, freq):
    from sklearn.ensemble import RandomForestRegressor
    return _fit_predict_lags(y, idx, h, freq, lambda: RandomForestRegressor(n_estimators=120, min_samples_leaf=2, random_state=0))


def m_gradient_boosting(y, idx, h, m, freq):
    from sklearn.ensemble import GradientBoostingRegressor
    return _fit_predict_lags(y, idx, h, freq, lambda: GradientBoostingRegressor(random_state=0))


def m_sarima(y, idx, h, m, freq):
    from statsmodels.tsa.statespace.sarimax import SARIMAX
    seasonal = (1, 0, 0, m) if (m > 1 and len(y) >= 2 * m + 2) else (0, 0, 0, 0)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        fit = SARIMAX(y, order=(1, 1, 1), seasonal_order=seasonal, enforce_stationarity=False,
                      enforce_invertibility=False).fit(disp=False, maxiter=60)
        return np.asarray(fit.forecast(h))


def _has(mod):
    try:
        __import__(mod)
        return True
    except Exception:
        return False


MODELS = {
    "naive": dict(label="Repeat last value", fn=m_naive, min=3, seasonal=False, needs=None,
                  about="Simple baseline: next periods equal the last one."),
    "moving_average": dict(label="Moving average", fn=m_moving_avg, min=3, seasonal=False, needs=None,
                           about="Average of the most recent periods. Smooths noise."),
    "drift": dict(label="Straight-line trend", fn=m_drift, min=4, seasonal=False, needs=None,
                  about="Extends the average rise or fall seen so far."),
    "seasonal_naive": dict(label="Same period last cycle", fn=m_seasonal_naive, min=None, seasonal=True, needs=None,
                           about="Repeats last year's pattern (needs a full cycle of history)."),
    "linear_seasonal": dict(label="Trend + seasonal pattern", fn=m_linear_seasonal, min=8, seasonal=False, needs=None,
                            about="Fits a trend line plus month/weekday effects when there is enough history."),
    "holt_winters": dict(label="Holt-Winters smoothing", fn=m_holt_winters, min=6, seasonal=False, needs=None,
                         about="Weighted smoothing of level, trend and seasonality."),
    "ridge_lags": dict(label="Ridge regression on past values", fn=m_ridge_lags, min=10, seasonal=False, needs=None,
                       about="Learns from the last few periods plus month/weekday effects."),
    "random_forest": dict(label="Random forest", fn=m_random_forest, min=14, seasonal=False, needs="sklearn",
                          about="Tree-based model on past values. Handles irregular patterns."),
    "gradient_boosting": dict(label="Gradient boosting", fn=m_gradient_boosting, min=14, seasonal=False, needs="sklearn",
                              about="Boosted trees on past values. Often strong on larger histories."),
    "sarima": dict(label="SARIMA", fn=m_sarima, min=12, seasonal=False, needs="statsmodels",
                   about="Classical statistical model for trend and seasonality."),
}


def min_len(spec, m):
    return 2 * m if spec["seasonal"] else spec["min"]


def eligibility(name, n, freq):
    spec, m = MODELS[name], FREQ[freq][1]
    if spec["needs"] and not _has(spec["needs"]):
        return False, f"Needs the {spec['needs']} package on the server."
    need = min_len(spec, m)
    if freq == "weekly" and name == "seasonal_naive":
        need = 2 * m
    if n < need:
        return False, f"Needs at least {need} {freq} periods of data (you have {n})."
    return True, None


def list_models(n, freq):
    out = []
    for name, spec in MODELS.items():
        ok, why = eligibility(name, n, freq)
        out.append({"name": name, "label": spec["label"], "about": spec["about"], "available": ok, "reason": why})
    return out


def _metrics(actual, pred):
    err = pred - actual
    den = np.abs(actual) + np.abs(pred)
    smape = np.where(den == 0, 0.0, 200 * np.abs(err) / np.where(den == 0, 1, den))
    return {"mae": float(np.mean(np.abs(err))), "rmse": float(np.sqrt(np.mean(err ** 2))), "smape_pct": float(np.mean(smape))}


def _predict(name, y, idx, h, freq):
    pred = np.asarray(MODELS[name]["fn"](y, idx, h, FREQ[freq][1], freq), dtype=float)
    if (y >= 0).all():
        pred = np.clip(pred, 0, None)
    return pred


def backtest(name, y, idx, h, freq, folds=3):
    """Rolling-origin test: train on the past, predict the next block, repeat. Never mixes future into training."""
    spec, m = MODELS[name], FREQ[freq][1]
    n = len(y)
    h_eff = max(1, min(h, n // 5))
    floor = max(min_len(spec, m), 6)
    acts, preds = [], []
    for k in range(folds, 0, -1):
        cut = n - k * h_eff
        if cut < floor:
            continue
        p = _predict(name, y[:cut], idx[:cut], h_eff, freq)
        acts.append(y[cut:cut + h_eff])
        preds.append(p)
    if not acts:
        return None
    res = _metrics(np.concatenate(acts), np.concatenate(preds))
    res["folds"] = len(acts)
    res["test_horizon"] = h_eff
    return res


def _degenerate(y, pred) -> bool:
    """True when a forecast collapses to roughly zero although recent sales were clearly above zero."""
    recent = float(np.mean(y[-min(6, len(y)):]))
    return bool((y >= 0).all() and recent > 0 and float(np.mean(pred)) < 0.05 * recent)


def run_model(name, y, idx, h, freq):
    y = np.asarray(y, dtype=float)
    ok, why = eligibility(name, len(y), freq)
    if not ok:
        raise ValueError(why)
    pred = _predict(name, y, idx, h, freq)
    fidx = future_index(idx, h, freq)
    bt = backtest(name, y, idx, h, freq)
    warns = []
    if _degenerate(y, pred):
        warns.append("This model predicts almost nothing for the coming periods, which does not look realistic. "
                     "Treat it as unreliable and try another model.")
    if bt and bt["smape_pct"] > 50:
        warns.append(f"On your past data this model was off by about {bt['smape_pct']:.0f}% on average. "
                     "Use the forecast only as a rough direction.")
    return {"model": name, "label": MODELS[name]["label"], "warnings": warns,
            "forecast": [{"period": d.strftime("%Y-%m-%d"), "value": round(float(v), 2)} for d, v in zip(fidx, pred)],
            "backtest": bt}


def compare(y, idx, h, freq, user_model=None, budget_s=20.0):
    y = np.asarray(y, dtype=float)
    t0, rows = time.time(), []
    for name, spec in MODELS.items():
        ok, why = eligibility(name, len(y), freq)
        if not ok:
            rows.append({"model": name, "label": spec["label"], "skipped": why})
            continue
        if time.time() - t0 > budget_s:
            rows.append({"model": name, "label": spec["label"], "skipped": "Skipped to stay within the time limit."})
            continue
        try:
            bt = backtest(name, y, idx, h, freq)
        except Exception as e:  # one failing model must not break the comparison
            rows.append({"model": name, "label": spec["label"], "skipped": f"Could not run: {str(e)[:80]}"})
            continue
        if bt is None:
            rows.append({"model": name, "label": spec["label"], "skipped": "Not enough history to test this model."})
            continue
        try:
            if _degenerate(y, _predict(name, y, idx, h, freq)):
                rows.append({"model": name, "label": spec["label"], "skipped": "Left out: it forecasts almost nothing, which is not realistic."})
                continue
        except Exception:
            pass
        rows.append({"model": name, "label": spec["label"], **bt})
    valid = sorted([r for r in rows if "rmse" in r], key=lambda r: r["rmse"])
    for i, r in enumerate(valid, 1):
        r["rank"] = i
    warnings_, verdict, recommended = [], "Not enough history to compare models reliably.", None
    m = FREQ[freq][1]
    if len(y) < 2 * m and freq == "monthly":
        warnings_.append(f"You have {len(y)} months of data. Seasonal patterns need about 24 months, so treat forecasts as rough.")
    if valid:
        best = valid[0]
        recommended = best["model"]
        base = next((r for r in valid if r["model"] in ("naive", "seasonal_naive")), None)
        by = {r["model"]: r for r in valid}
        if user_model and user_model in by and user_model != best["model"]:
            u = by[user_model]
            gain = (u["rmse"] - best["rmse"]) / u["rmse"] * 100 if u["rmse"] else 0
            if gain < 5:
                verdict = (f"{best['label']} scored best, but only {gain:.1f}% better than your choice ({u['label']}). "
                           "That is within normal noise, so your model is fine.")
            else:
                verdict = f"On your data, {best['label']} had {gain:.0f}% lower error than {u['label']}."
        elif user_model and user_model == best["model"]:
            verdict = f"Your choice, {best['label']}, was the best performer on your data."
        else:
            verdict = f"{best['label']} performed best on your data."
        if base and best["model"] not in ("naive", "seasonal_naive") and base["rmse"]:
            if (base["rmse"] - best["rmse"]) / base["rmse"] * 100 < 5:
                warnings_.append("No model clearly beats the simple baseline, so forecasts here carry high uncertainty.")
        if best["smape_pct"] > 50:
            warnings_.append(f"Even the best model misses by about {best['smape_pct']:.0f}% on your past data. "
                             "Sales here swing a lot from period to period, so use forecasts only as a rough direction.")
        if len(valid) > 1 and valid[1]["rmse"] and (valid[1]["rmse"] - best["rmse"]) / valid[1]["rmse"] * 100 < 3:
            warnings_.append(f"{best['label']} and {valid[1]['label']} are almost tied; either is reasonable.")
    return {"ranking": rows, "recommended": recommended, "verdict": verdict, "warnings": warnings_}
