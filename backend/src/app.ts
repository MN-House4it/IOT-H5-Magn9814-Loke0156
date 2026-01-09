import express from 'express';
import expressWs from 'express-ws';

// eslint-disable-next-line @typescript-eslint/unbound-method
export const { app, getWss, applyTo } = expressWs(express());

export default app;
