---
title: "Placeholder paper: Bias corrected moments under 8 bit optimizer state"
authors: ["Wei Lin", "Antyabha Rahman", "Priya Nandakumar"]
venue: NeurIPS 2026 Workshop
date: 2026-07-11
description: Quantizing Adam's second moment to 8 bits interacts with bias correction in the first thousand steps and costs accuracy unless the correction is applied before quantization.
arxiv: https://example.com
code: https://example.com
---

<!-- Placeholder. Replace this file with your own content. Keep the frontmatter keys. -->

This is a placeholder entry for a paper that does not exist.

Memory efficient optimizers store Adam's moments in 8 bits. We show that the order of quantization and bias correction matters early in training. The stored second moment $v_t$ is smaller than its target by the factor $1 - \beta_2^t$, so at step 100 with $\beta_2 = 0.999$ it occupies about 9.5 percent of the dynamic range the quantizer was calibrated for.

$$
\mathbb{E}[v_t] = \mathbb{E}[g^2]\left(1 - \beta_2^{\,t}\right)
$$

Quantizing before correction throws away roughly 3.4 bits of the 8 at step 1, and the loss decays with the same time constant as the correction factor. We measure the effect on a 350M parameter model and find a 0.6 point drop in downstream accuracy against full precision state.

The fix is to rescale the buffer by the correction factor before quantizing and to undo the rescale on read. The change costs one multiply per tensor per step and closes the gap to 0.1 points. We release a drop in optimizer implementation.
