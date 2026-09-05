---
title: Placeholder project two
description: A small library that replays optimizer state from checkpoints so you can compare update magnitudes across runs.
date: 2026-05-06
tags: [optimization]
repo: https://github.com/AntyabhaRahman/placeholder
status: done
---

<!-- Placeholder. Replace this file with your own content. Keep the frontmatter keys. -->

A placeholder project entry.

The library loads a sequence of checkpoints, reads the Adam moment buffers out of each one, and reconstructs the update that the optimizer applied between any two saves. It reports the per tensor ratio of update norm to parameter norm, which is the number most people want when they suspect the learning rate is wrong.

It reads torch and safetensors checkpoints, holds one tensor in memory at a time, and runs on a laptop for models up to 7B parameters. A single 7B checkpoint pair takes about 90 seconds to process. The output is a dataframe, so grouping by layer or by tensor type is left to the caller.
