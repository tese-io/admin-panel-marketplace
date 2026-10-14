import { useState } from "react";

import { EllipsisHorizontal, Eye, History } from "@medusajs/icons";
import { Badge, Container, DropdownMenu, Heading, Select, Table, Text } from "@medusajs/ui";

import { formatDate } from "@lib/date";

import {
  useBusinessVerifications,
  type BusinessVerification,
  type VerificationStatus,
} from "@hooks/api/business-verifications";

import { BusinessVerificationDetail } from "./components/business-verification-detail";

const PAGE_SIZE = 20;

type Filter = VerificationStatus | "all";

export const statusBadge = (status: VerificationStatus) => {
  const color =
    status === "verified" ? "green" : status === "rejected" ? "red" : status === "archived" ? "grey" : "orange";
  const label =
    status === "verified" ? "Verified" : status === "rejected" ? "Declined" : status === "archived" ? "Archived" : "Pending";
  return (
    <Badge size="2xsmall" color={color} data-testid={`business-verification-status-${status}`}>
      {label}
    </Badge>
  );
};

export const RequestBusinessVerificationList = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [filter, setFilter] = useState<Filter>("pending");
  const [detailId, setDetailId] = useState<string | undefined>(undefined);

  const { data, isLoading, refetch } = useBusinessVerifications({
    offset: currentPage * PAGE_SIZE,
    limit: PAGE_SIZE,
    status: filter === "all" ? undefined : filter,
  });
  const rows = data?.business_verifications ?? [];
  const count = data?.count ?? 0;

  return (
    <Container data-testid="request-business-verification-list-container">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Business verification</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Registration documents submitted by sellers. Approve after checking the document (and the public registry where one exists); decline with a reason the seller sees.
          </Text>
        </div>
        <div className="w-[180px]">
          <Select
            value={filter}
            onValueChange={(v) => {
              setFilter(v as Filter);
              setCurrentPage(0);
            }}
          >
            <Select.Trigger data-testid="business-verification-filter">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="pending">Pending</Select.Item>
              <Select.Item value="verified">Verified</Select.Item>
              <Select.Item value="rejected">Declined</Select.Item>
              <Select.Item value="all">All</Select.Item>
            </Select.Content>
          </Select>
        </div>
      </div>

      <BusinessVerificationDetail
        id={detailId}
        open={Boolean(detailId)}
        close={() => {
          setDetailId(undefined);
          refetch();
        }}
      />

      <div className="flex size-full flex-col overflow-hidden">
        {isLoading && <Text className="px-6 py-2">Loading...</Text>}
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Legal name</Table.HeaderCell>
              <Table.HeaderCell>Seller</Table.HeaderCell>
              <Table.HeaderCell>Country</Table.HeaderCell>
              <Table.HeaderCell>Submitted</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((row: BusinessVerification) => (
              <Table.Row key={row.id} data-testid={`business-verification-row-${row.id}`}>
                <Table.Cell>{row.legal_name}</Table.Cell>
                <Table.Cell>{row.seller?.name ?? row.seller_id}</Table.Cell>
                <Table.Cell>{row.country_of_registration.toUpperCase()}</Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <History />
                    {formatDate(row.created_at)}
                  </div>
                </Table.Cell>
                <Table.Cell>{statusBadge(row.status)}</Table.Cell>
                <Table.Cell>
                  <DropdownMenu>
                    <DropdownMenu.Trigger asChild>
                      <div data-testid={`business-verification-menu-${row.id}`}>
                        <EllipsisHorizontal />
                      </div>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      <DropdownMenu.Item className="gap-x-2" onClick={() => setDetailId(row.id)}>
                        <Eye className="text-ui-fg-subtle" />
                        Review
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        {!isLoading && rows.length === 0 && (
          <Text size="small" className="px-6 py-4 text-ui-fg-subtle" data-testid="business-verification-empty">
            Nothing to review.
          </Text>
        )}
        <Table.Pagination
          className="w-full"
          canNextPage={PAGE_SIZE * (currentPage + 1) < count}
          canPreviousPage={currentPage > 0}
          previousPage={() => setCurrentPage(currentPage - 1)}
          nextPage={() => setCurrentPage(currentPage + 1)}
          count={count}
          pageCount={Math.ceil(count / PAGE_SIZE)}
          pageIndex={currentPage}
          pageSize={PAGE_SIZE}
        />
      </div>
    </Container>
  );
};
