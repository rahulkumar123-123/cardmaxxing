import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/http';
import * as cardService from './service';

export const listCardsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await cardService.listCards(req.query as never);
  res.json({ success: true, data: result });
});

export const getCardHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await cardService.getCardBySlug(req.params.slug!);
  res.json({ success: true, data: { card } });
});

export const compareCardsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { slugs } = req.query as unknown as { slugs: string[] };
  const cards = await cardService.compareCards(slugs);
  res.json({ success: true, data: { cards } });
});

export const facetsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const facets = await cardService.getFacets();
  res.json({ success: true, data: facets });
});
