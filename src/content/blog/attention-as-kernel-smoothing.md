---
title: Attention as kernel smoothing
description: Self attention computes a Nadaraya Watson average with an exponential inner product kernel whose bandwidth is set by the head width.
date: 2026-04-14
tags: [attention, kernels]
---

<!-- Placeholder. Replace this file with your own content. Keep the frontmatter keys. -->

## An estimator from 1964

Nadaraya and Watson each proposed the same way to estimate the conditional mean $\mathbb{E}[y \mid x]$ with no parameters to fit. Weight every observed label by how close its input sits to the query point, then take the weighted average.

$$
\hat{f}(x) = \frac{\sum_{i=1}^{n} K(x, x_i)\, y_i}{\sum_{j=1}^{n} K(x, x_j)}
$$

The kernel $K$ decides what close means. A Gaussian kernel $K(x, x') = \exp\!\left(-\lVert x - x' \rVert^2 / 2h^2\right)$ uses one bandwidth $h$ to set the width of the neighborhood.

## The same average, with learned coordinates

Take one attention head with query $q$, keys $k_1, \dots, k_n$ and values $v_1, \dots, v_n$, all in $\mathbb{R}^d$.

$$
\mathrm{Attn}(q, K, V) = \sum_{i=1}^{n} \frac{\exp\!\left(q^\top k_i / \sqrt{d}\right)}{\sum_{j=1}^{n} \exp\!\left(q^\top k_j / \sqrt{d}\right)}\, v_i
$$

Read each fraction as a weight and the two formulas line up term by term. Attention is Nadaraya Watson regression with kernel $K(q, k) = \exp(q^\top k / \sqrt{d})$, queries standing in for the query point, keys for the training inputs and values for the labels.

That exponential inner product kernel is closer to the Gaussian than it looks. Expand the squared distance as $\lVert q - k \rVert^2 = \lVert q \rVert^2 - 2 q^\top k + \lVert k \rVert^2$. Hold the query fixed and normalize the keys to unit norm, and both norm terms become constants that cancel in the ratio. What is left is a Gaussian kernel with bandwidth $h = d^{1/4}$. At a head width of $d = 64$ that is $h \approx 2.83$.

## What the reading is good for

Bandwidth is temperature. Divide the scores by $\tau$ and a small $\tau$ narrows the kernel until the head copies its nearest key, while a large $\tau$ widens it until the head returns the plain mean of the values. The $\sqrt{d}$ divisor is itself a bandwidth choice. It holds the variance of $q^\top k$ near 1 when the entries have unit variance, so the head does not collapse onto a single key as $d$ grows.

```python
import numpy as np

def nadaraya_watson(q, keys, values, h):
    w = np.exp(-((keys - q) ** 2).sum(axis=1) / (2 * h ** 2))
    return w @ values / w.sum()

def attention(q, keys, values):
    s = keys @ q / np.sqrt(q.shape[0])
    w = np.exp(s - s.max())
    return w @ values / w.sum()
```

On unit norm rows the two functions return the same vector once you set `h = d ** 0.25`.

Kernel regression also carries a known error budget. Bias grows as $O(h^2)$ and variance falls as $O(1/(n h^d))$, so a wide head oversmooths and a narrow head is noisy when few tokens are in scope. The learned projections earn their place in that second term. They cut the exponent from the model width, often 4096, down to the head width of 64.

## Where the analogy stops

The kernel is asymmetric, because queries and keys come from different projections, so $K(a, b)$ and $K(b, a)$ disagree and the classical theory for symmetric positive definite kernels does not transfer as written. The values are learned rather than observed labels, so a head can move $v_i$ anywhere that helps the next layer. Use the mapping to reason about bandwidth and smoothing, not to import proofs.
