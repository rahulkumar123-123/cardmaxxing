import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { cardSlugSchema, compareSchema, listCardsSchema } from './schemas';
import { compareCardsHandler, facetsHandler, getCardHandler, listCardsHandler } from './controller';

export const cardsRouter = Router();

cardsRouter.get('/', validate({ query: listCardsSchema }), listCardsHandler);
cardsRouter.get('/facets', facetsHandler);
cardsRouter.get('/compare', validate({ query: compareSchema }), compareCardsHandler);
cardsRouter.get('/:slug', validate({ params: cardSlugSchema }), getCardHandler);
