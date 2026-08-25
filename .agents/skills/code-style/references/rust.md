# Rust

- Coverage: llvm-cov and tarpaulin measure different things. llvm-cov counts
  lines exercised only by inline `#[cfg(test)]` tests as covered, inflating
  the number. Verify what a tool counts before migrating CI to it.
