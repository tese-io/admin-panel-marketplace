import { Container, Heading } from "@medusajs/ui";

import { MatrixInbox } from "../../components/matrix";
import { MatrixProvider } from "../../providers/matrix-provider";

export const Messages = () => {
  return (
    <Container className="divide-y p-0 min-h-[700px]" data-testid="messages-container">
      <div className="flex items-center justify-between px-6 py-4" data-testid="messages-header">
        <div>
          <Heading data-testid="messages-heading">Messages</Heading>
        </div>
      </div>
      <div className="h-[655px] py-2" data-testid="messages-content">
        <MatrixProvider>
          <MatrixInbox className="h-full" />
        </MatrixProvider>
      </div>
    </Container>
  );
};
