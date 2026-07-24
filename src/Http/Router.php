<?php

declare(strict_types=1);

namespace ScienceSims\Http;

/**
 * Table-driven API router: exact method+path keys and regex pattern routes.
 *
 * @phpstan-type RouteHandler callable(array<string, string>): void
 */
final class Router
{
    /** @var array<string, callable> */
    private array $exact = [];

    /** @var list<array{method:string, pattern:string, handler:callable}> */
    private array $patterns = [];

    /**
     * @param callable $handler
     */
    public function addExact(string $method, string $path, callable $handler): self
    {
        $method = strtoupper($method);
        $path = '/' . trim($path, '/');
        if ($path === '/') {
            $path = '/';
        }
        $this->exact[$method . ' ' . $path] = $handler;
        return $this;
    }

    /**
     * Register the same handler for multiple HTTP methods on one path.
     *
     * @param list<string> $methods
     * @param callable $handler
     */
    public function addMethods(array $methods, string $path, callable $handler): self
    {
        foreach ($methods as $method) {
            $this->addExact((string) $method, $path, $handler);
        }
        return $this;
    }

    /**
     * @param string $pattern Full route key regex without delimiters, e.g. '^GET /simulations/([^/]+)$'
     * @param callable $handler Receives named/numbered capture groups as string map
     */
    public function addPattern(string $pattern, callable $handler): self
    {
        $this->patterns[] = [
            'method' => '',
            'pattern' => $pattern,
            'handler' => $handler,
        ];
        return $this;
    }

    /**
     * @return list<string>
     */
    public function exactKeys(): array
    {
        return array_keys($this->exact);
    }

    public function patternCount(): int
    {
        return count($this->patterns);
    }

    /**
     * @return array{handler:callable, params:array<int|string, string>}|null
     */
    public function match(string $method, string $path): ?array
    {
        $method = strtoupper($method);
        $path = '/' . trim($path, '/');
        if ($path !== '/') {
            $path = rtrim($path, '/') ?: '/';
        }
        $key = $method . ' ' . $path;

        if (isset($this->exact[$key])) {
            return ['handler' => $this->exact[$key], 'params' => []];
        }

        $routeKey = $key;
        foreach ($this->patterns as $row) {
            if (preg_match('#' . $row['pattern'] . '#', $routeKey, $m)) {
                $params = [];
                foreach ($m as $k => $v) {
                    if ($k === 0) {
                        continue;
                    }
                    $params[$k] = (string) $v;
                }
                return ['handler' => $row['handler'], 'params' => $params];
            }
        }

        return null;
    }

    public function dispatch(string $method, string $path): bool
    {
        $hit = $this->match($method, $path);
        if ($hit === null) {
            return false;
        }
        ($hit['handler'])($hit['params']);
        return true;
    }
}
