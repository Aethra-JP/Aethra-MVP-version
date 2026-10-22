# How Aethra calculates things

Every number in a report is computed by code from your uploaded file, not guessed by the AI. Use the "How was this calculated?" button to see the formula, the columns and any filters behind a figure.

The AI only explains numbers it has been given. If a sentence contains a number that cannot be traced back to the computed results, Aethra falls back to a plain template summary.

Unusual days are found with a robust statistic based on the median and the median absolute deviation, so a few extreme days do not hide other unusual days.

Forecasts are tested before you rely on them. Aethra trains each model on the past, predicts the next block of periods, compares with what really happened, and repeats this several times. The model with the lowest error on your own data is recommended. If the top models are close, Aethra tells you the difference is within normal noise.

Seasonal forecasts need history. About two years of monthly data are needed to see yearly patterns clearly. With less history, treat forecasts as rough guidance.
