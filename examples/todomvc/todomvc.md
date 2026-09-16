# Create TodoMVC

Full-stack TodoMVC fabricated end-to-end: an OpenAPI contract, a typed client, an
Express backend, a React frontend, and end-to-end tests.

## Background

Scaffold the workspace and add the plugins. Runs once; every phase depends on it.

* **Tank**: Initialize an Nx workspace named "todomvc"
* Add the "@nx/node" plugin
* Add the "@nx/react" plugin

## apiSpec

Design the API contract first.

* **Tank**: Create an OpenAPI spec for "todos" → `spec`
* expect `successfulBuild`

## backend

Generate the Node app and implement the Express server.

Needs: apiSpec

* <Tank> generates a Node app named "api" at `file:///apps/todo-svc/`
* he implement the Express backend from `spec` into `api`
* he expects `successfulBuild`

## apiClient

Generate a typed client from the spec — runs in parallel with **backend**.

Needs: apiSpec

* <Tank> generate a library named "api-client"
* Generate an API client from `spec` → `client`
* expect `successfulBuild`

## frontend

Build the React UI against the typed client.

Needs: apiClient

* **Tank**: Generate a React app named "web" → `web`
* Implement the TodoMVC frontend in `web` using `client`
* expect `successfulBuild`

## e2e

End-to-end tests against the running app.

Needs: backend, frontend

* **Tank**: Write Playwright tests for `web`
* expect `successfulBuild`

## ship

Integrate the branches and release.

Needs: e2e

* **Smith**: Ensure `successfulBuild`
* The run ends in one merge request; a human review is the exit criterion
  (`delivery: mergeRequest()`)
