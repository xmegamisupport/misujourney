import type { WhatsAppContactMethod } from "@/lib/whatsapp";

export interface CoachContact {
  coachId: string;
  name: string;
  avatar: string;
  whatsappContactMethod: WhatsAppContactMethod;
  whatsappNormalizedNumber: string | null;
  whatsappCustomLink: string | null;
}
