# typefail

Test for expected compile-time errors in Typescript

## Overview

Static type checking is one of the major benefits of Typescript, so we create ambient typings to get static type checking with Javascript libraries, but we typically only test those typings for on good code. We run the `tsc` compiler and move on if it compiles. We don't normally make sure that those typings produce compile-time errors on bad type assignments, which is their actual purpose. This library and CLI provides a way to do this by embedding declarations within the code that tests the typings.

There are also times when we may want to make sure that pure Typescript libraries produce compile-time errors. We normally rely on Typescript to verify type assignments at build time, but Typescript is evolving, and the behavior of edge cases may change over time. Sometimes it's important to include in a library's test suite a confirmation of the behavior that the library expects of Typescript in these edge cases. The present library and CLI is useful for this purpose too.

This module was originally inspired by the module [`typings-tester`](https://github.com/aikoven/typings-tester).

## Usage

// UNDER CONSTRUCTION

## CLI

// UNDER CONSTRUCTION

## API

// UNDER CONSTRUCTION
