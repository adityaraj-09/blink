# Code Indexer

An intelligent code indexing tool with incremental Merkle tree-based change detection and vector embeddings for semantic code search.

## Overview

This tool implements a sophisticated code indexing pipeline that efficiently tracks changes in your codebase and enables semantic search across code. It combines several advanced techniques:

1. **Merkle Tree-based Change Detection** - Efficiently detect which files have changed
2. **Tree-sitter Code Chunking** - Extract semantic chunks (functions, classes, methods)
3. **Embedding Cache** - Reuse embeddings for unchanged code chunks
4. **Vector Search** - Find semantically similar code using embeddings
5. **SQLite Storage** - Persistent storage for embeddings and metadata

## Features

- **Incremental Indexing**: Only process changed files using Merkle tree comparison (O(log n))
- **Smart Code Chunking**: Parse code with tree-sitter to extract meaningful chunks
- **Embedding Cache**: Avoid recomputing embeddings for unchanged code
- **Multi-Language Support**: TypeScript, JavaScript, Python, Rust, Go, Java
- **Vector Search**: Find semantically similar code chunks
- **Efficient Storage**: SQLite for metadata, optimized vector storage


