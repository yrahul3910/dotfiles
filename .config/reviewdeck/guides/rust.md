---
name: Rust
languages: [rust]
always: false
---
# Rust

Source: personal code-style rules (~/.pi/agent/skills/code-style/references/rust.md).

- [R1] Coverage tooling: llvm-cov and tarpaulin measure different things (llvm-cov counts lines exercised only by inline `#[cfg(test)]` tests as covered, inflating the number). Flag CI migrations between coverage tools that don't account for what each one counts.
