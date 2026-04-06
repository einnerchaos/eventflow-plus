import { RuleEngineService } from './rule-engine.service';

describe('RuleEngineService', () => {
  let service: RuleEngineService;

  beforeEach(() => {
    service = new RuleEngineService();
  });

  describe('evaluateConditions', () => {
    it('matches simple equality on root payload fields', async () => {
      const ok = await service.evaluateConditions(
        { all: [{ field: 'amount', operator: '==', value: 100 }] },
        { amount: 100, currency: 'USD' },
      );
      expect(ok).toBe(true);
    });

    it('evaluates nested field paths (dot notation)', async () => {
      const ok = await service.evaluateConditions(
        { all: [{ field: 'order.total', operator: '>', value: 50 }] },
        { order: { total: 99 } },
      );
      expect(ok).toBe(true);
    });

    it('supports any (OR) groups', async () => {
      const ok = await service.evaluateConditions(
        {
          all: [
            {
              any: [
                { field: 'region', operator: '==', value: 'EU' },
                { field: 'region', operator: '==', value: 'US' },
              ],
            },
          ],
        },
        { region: 'EU' },
      );
      expect(ok).toBe(true);
    });

    it('returns false when AND branch fails', async () => {
      const ok = await service.evaluateConditions(
        {
          all: [
            { field: 'amount', operator: '>', value: 1000 },
            { field: 'currency', operator: '==', value: 'USD' },
          ],
        },
        { amount: 10, currency: 'USD' },
      );
      expect(ok).toBe(false);
    });
  });

  describe('validateConditionStructure', () => {
    it('accepts well-formed compound conditions', () => {
      expect(() =>
        service.validateConditionStructure({
          all: [{ field: 'x', operator: '==', value: 1 }],
        }),
      ).not.toThrow();
    });

    it('rejects invalid operator', () => {
      expect(() =>
        service.validateConditionStructure({
          all: [{ field: 'x', operator: '===', value: 1 } as any],
        }),
      ).toThrow();
    });
  });
});
