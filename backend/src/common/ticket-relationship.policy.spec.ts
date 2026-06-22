import { describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { validateTicketRelationship } from './ticket-relationship.policy';

describe('ticket relationship policy', () => {
  it('rejects self-links', () => {
    expect(() => validateTicketRelationship('ticket-1', 'ticket-1', false)).toThrow(BadRequestException);
  });

  it('rejects duplicate links', () => {
    expect(() => validateTicketRelationship('ticket-1', 'ticket-2', true)).toThrow(BadRequestException);
  });

  it('allows a new relationship between different tickets', () => {
    expect(() => validateTicketRelationship('ticket-1', 'ticket-2', false)).not.toThrow();
  });
});
