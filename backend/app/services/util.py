import math
from datetime import date, datetime

import numpy as np
import pandas as pd


def jsonable(o):
    """Convert numpy / pandas / NaN values into plain JSON-safe Python."""
    if isinstance(o, dict):
        return {str(k): jsonable(v) for k, v in o.items()}
    if isinstance(o, (list, tuple, set)):
        return [jsonable(v) for v in o]
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, (np.floating, float)):
        f = float(o)
        return None if (math.isnan(f) or math.isinf(f)) else f
    if isinstance(o, np.bool_):
        return bool(o)
    if o is pd.NaT:
        return None
    if isinstance(o, (pd.Timestamp, datetime)):
        return o.isoformat()[:10]
    if isinstance(o, date):
        return o.isoformat()
    return o
