"use client";

import { useState, useMemo } from "react";
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
} from "@mui/x-data-grid";
import {
  Box,
  Chip,
} from "@mui/material";
// import { Convention } from "@prisma/client"; // No longer importing from Prisma client directly here
import ConventionActions from "./ConventionActions"; // Path will be correct after move
// import BulkActions from "./BulkActions"; // Path will be correct after move. TEMPORARILY COMMENTED OUT

// Copied from page.tsx for consistency
enum ConventionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  PAST = 'PAST',
  CANCELLED = 'CANCELLED'
}

// Copied from page.tsx for consistency
interface Convention {
  id: string;
  name: string;
  slug: string;
  startDate: Date | null;
  endDate: Date | null;
  city: string;
  country: string;
  venueName: string | null;
  websiteUrl: string | null;
  status: ConventionStatus;
  galleryImageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
  stateAbbreviation: string | null;
  stateName: string | null;
  seriesId: string;
  deletedAt: Date | null;
  coverImageUrl: string | null;
  descriptionMain: string | null;
  descriptionShort: string | null;
  isOneDayEvent: boolean;
  isTBD: boolean;
  profileImageUrl: string | null;
}

// Helper function to format Date object to DD Mmm YY using UTC methods
const formatDateToDDMonYY_UTC = (date: Date | string | null): string => {
  // console.log('formatDateToDDMonYY_UTC received:', date, '(type:', typeof date, ')'); // Keep for debugging if needed
  if (!date) {
    // console.log('Date is null or empty, returning N/A');
    return "N/A";
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    // console.log('Parsed date is invalid (isNaN), returning N/A. Original value:', date);
    return "N/A";
  }

  const day = String(d.getUTCDate()).padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[d.getUTCMonth()];
  const year = String(d.getUTCFullYear()).slice(-2); // Get last two digits of the year

  return `${day} ${month} ${year}`;
};

interface ConventionListProps {
  conventions: Convention[];
  isAdmin: boolean;
  viewMode?: "active" | "deleted";
  onActionComplete: () => void;
}

const getColumns = (viewMode?: "active" | "deleted", onActionComplete?: () => void): GridColDef[] => [
  {
    field: "name",
    headerName: "Name",
    flex: 1,
    minWidth: 200,
  },
  {
    field: "status",
    headerName: "Status",
    width: 130,
    renderCell: (params: GridRenderCellParams) => (
      <Chip
        label={params.value}
        color={
          params.value === "PUBLISHED"
            ? "success"
            : params.value === "DRAFT"
              ? "default"
              : "warning"
        }
        size="small"
      />
    ),
  },
  {
    field: "startDate",
    headerName: "Start Date",
    width: 130,
    renderCell: (params: GridRenderCellParams) => {
      // console.log(`STARTDATE RC: Field="${params.field}", Value="${params.value}", Row available? ${!!params.row}`);
      if (params.row && params.row.startDate) {
        return formatDateToDDMonYY_UTC(params.row.startDate as string); // Use new function
      }
      // console.error(`STARTDATE RC: Row or startDate missing. Row: ${JSON.stringify(params.row)}, Value: ${params.value}`);
      return "N/A";
    }
  },
  {
    field: "endDate",
    headerName: "End Date",
    width: 130,
    renderCell: (params: GridRenderCellParams) => {
      // console.log(`ENDDATE RC: Field="${params.field}", Value="${params.value}", Row available? ${!!params.row}`);
      if (params.row && params.row.endDate) {
        return formatDateToDDMonYY_UTC(params.row.endDate as string); // Use new function
      }
      // console.error(`ENDDATE RC: Row or endDate missing. Row: ${JSON.stringify(params.row)}, Value: ${params.value}`);
      return "N/A";
    }
  },
  {
    field: "actions",
    headerName: "Actions",
    width: 100,
    sortable: false,
    renderCell: (params: GridRenderCellParams) => (
      <ConventionActions
        convention={params.row}
        onConventionUpdated={onActionComplete}
      />
    ),
  },
];

export default function ConventionList({ conventions, isAdmin, viewMode = "active", onActionComplete }: ConventionListProps) {
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  const gridRows = useMemo(() => conventions.map(c => ({ ...c, id: String(c.id) })), [conventions]);

  // Memoize columns to ensure stability
  const columns = useMemo(() => getColumns(viewMode, onActionComplete), [viewMode, onActionComplete]);

  return (
    <Box>
      {/* {viewMode === "active" && (  
        <BulkActions
          selectedIds={selectedIds as string[]} 
          onActionComplete={() => setSelectedIds([])}
        />
      )} */}
      <Box sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={gridRows}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50]}
          getRowId={(row) => row.id}
        />
      </Box>
    </Box>
  );
} 