---
title: Why Adam needs bias correction
description: Adam starts both moment estimates at zero, and the geometric sum that follows explains the 1 minus beta to the t divisor.
date: 2026-06-02
tags: [optimization, adam]
note: At beta two 0.999, the raw second moment is still 37 percent low at step 1000.
---

<!-- Placeholder. Replace this file with your own content. Keep the frontmatter keys. -->

## Two running averages that start cold

Adam keeps an exponential moving average of the gradient $g_t$ and a second one of the squared gradient. The updates are $m_t = \beta_1 m_{t-1} + (1 - \beta_1) g_t$ and $v_t = \beta_2 v_{t-1} + (1 - \beta_2) g_t^2$, and both buffers start at zero. Zero is the honest starting point, since no gradient has arrived yet. It is also what drags the early estimates down.

## Unrolling the recursion

Expand the recursion for $m_t$ back to the zero initial state.

$$
m_t = (1 - \beta_1) \sum_{i=1}^{t} \beta_1^{\,t-i} g_i
$$

Assume the gradient distribution holds still over the window the average covers, so $\mathbb{E}[g_i] = \mathbb{E}[g]$ for every $i$. Pull the expectation through the sum and substitute $k = t - i.$

$$
\mathbb{E}[m_t] = (1 - \beta_1)\, \mathbb{E}[g] \sum_{k=0}^{t-1} \beta_1^{\,k} = \mathbb{E}[g] \left(1 - \beta_1^{\,t}\right)
$$

The geometric sum equals $(1 - \beta_1^t) / (1 - \beta_1)$, and its denominator cancels the leading factor. So $m_t$ estimates the mean gradient shrunk by $1 - \beta_1^t$, a number below 1 at every finite step. Divide it out and $\hat{m}_t = m_t / (1 - \beta_1^t)$ is unbiased. Repeat the argument with $g_t^2$ in place of $g_t$ and you get the factor $1 - \beta_2^t$ for the second moment.

## How far off the raw estimate is

| Step $t$ | $1 - 0.999^t$ |
| --- | --- |
| 1 | 0.0010 |
| 10 | 0.0100 |
| 100 | 0.0952 |
| 1000 | 0.6323 |
| 5000 | 0.9933 |

At the default $\beta_2 = 0.999$, the uncorrected second moment sits at a thousandth of its target on step 1 and is still 37 percent low after a thousand steps.

The first update shows the cost. With $m_1 = 0.1 g_1$ and $v_1 = 0.001 g_1^2$, the raw ratio $m_1 / \sqrt{v_1}$ has magnitude $0.1 / \sqrt{0.001} \approx 3.16$, so the optimizer moves 3.2 times the learning rate when the design calls for 1. Correction restores $g_1$ and $g_1^2$, and the ratio comes out at exactly 1.

The two factors also disagree with each other for a long stretch. With the defaults, $1 - \beta_1^t$ passes 0.99 at step 44 while $1 - \beta_2^t$ needs step 4603. In between, the numerator is near unbiased and the denominator is still too small, so the raw step size runs high for thousands of updates.

## The correction in code

```python
def adam_step(p, g, m, v, t, lr=1e-3, b1=0.9, b2=0.999, eps=1e-8):
    m = b1 * m + (1 - b1) * g
    v = b2 * v + (1 - b2) * g * g
    m_hat = m / (1 - b1 ** t)
    v_hat = v / (1 - b2 ** t)
    return p - lr * m_hat / (v_hat ** 0.5 + eps), m, v
```

The step counter starts at 1. Calling this with $t = 0$ divides by zero, and resetting $t$ when you reload a checkpoint reruns the whole warm start.

## The other fix people use

Linear warmup covers the same gap from the other side by keeping the learning rate small while the buffers fill. Most large runs use warmup and bias correction together, because warmup alone leaves the ratio wrong and only makes the wrong steps shorter.
