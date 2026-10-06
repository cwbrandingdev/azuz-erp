import { parseWhatsappWebhook } from './whatsapp-webhook.parser';
import { toWhatsappId } from './whatsapp-phone.util';

describe('WhatsApp helpers', () => {
  it('normalizes Brazilian phones to WhatsApp ids', () => {
    expect(toWhatsappId('11987654321')).toBe('5511987654321');
    expect(toWhatsappId('+55 11 98765-4321')).toBe('5511987654321');
    expect(toWhatsappId('')).toBeNull();
  });

  it('parses inbound text and delivery status from a Cloud API webhook', () => {
    const parsed = parseWhatsappWebhook({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: '123456' },
                contacts: [{ profile: { name: 'Maria' }, wa_id: '5511999999999' }],
                messages: [
                  {
                    from: '5511999999999',
                    id: 'wamid.abc',
                    timestamp: '1710000000',
                    type: 'text',
                    text: { body: 'Oi' },
                  },
                ],
                statuses: [
                  {
                    id: 'wamid.out',
                    status: 'delivered',
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(parsed.messages).toEqual([
      {
        phoneNumberId: '123456',
        waId: '5511999999999',
        waMessageId: 'wamid.abc',
        timestamp: '1710000000',
        type: 'TEXT',
        body: 'Oi',
        contactName: 'Maria',
      },
    ]);
    expect(parsed.statuses).toEqual([
      {
        phoneNumberId: '123456',
        waMessageId: 'wamid.out',
        status: 'DELIVERED',
        errorMessage: null,
      },
    ]);
  });
});
