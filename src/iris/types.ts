/** Shape of a single message entry returned by Circle's Iris v2 messages endpoint. */
export interface IrisMessage {
  attestation: string | null;
  message: string | null;
  eventNonce: string;
  cctpVersion: number;
  status: "pending_confirmations" | "complete";
  decodedMessage?: {
    sourceDomain: string;
    destinationDomain: string;
    nonce: string;
    sender: string;
    recipient: string;
    destinationCaller: string;
  };
}

export interface IrisMessagesResponse {
  messages: IrisMessage[];
}

export interface IrisFeeEntry {
  finalityThreshold: number;
  minimumFee: number; // basis points
}

export interface IrisFeesResponse {
  data: IrisFeeEntry[];
}
