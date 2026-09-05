---
title: Placeholder project one
description: A command line tool that records attention weight entropy per layer during a training run and writes it to a single parquet file.
date: 2026-03-18
tags: [tooling]
repo: https://github.com/AntyabhaRahman/placeholder
status: active
---

<!-- Placeholder. Replace this file with your own content. Keep the frontmatter keys. -->

A placeholder project entry.

The tool hooks every attention module in a PyTorch model, computes the entropy of the softmax weights per head, and appends one row per layer per logging step. Output goes to a single parquet file so a run of 50000 steps stays under 40MB. A second command plots entropy against step for any subset of layers.

It is built with PyTorch hooks, pyarrow for the writer, and matplotlib for the plots. Overhead is about 2 percent of step time at a logging interval of 100 steps. It works with any model that exposes standard attention modules and needs no changes to the training loop.
