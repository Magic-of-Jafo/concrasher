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
import { Convention } from "@prisma/client";
import ConventionActions from "./ConventionActions"; // Path will be correct after move
// import BulkActions from "./BulkActions"; // Path will be correct after move. TEMPORARILY COMMENTED OUT

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
    valueGetter: (params: any) => {
      if (params.row && params.row.startDate) {
        return new Date(params.row.startDate).toLocaleDateString();
      }
      return "N/A";
    },
  },
  {
    field: "endDate",
    headerName: "End Date",
    width: 130,
    valueGetter: (params: any) => {
      if (params.row && params.row.endDate) {
        return new Date(params.row.endDate).toLocaleDateString();
      }
      return "N/A"; 
    },
  },
  {
    field: "actions",
    headerName: "Actions",
    width: 100,
    sortable: false,
    renderCell: (params: GridRenderCellParams) => (
      <ConventionActions
        conventionId={params.row.id}
        conventionName={params.row.name}
        currentStatus={params.row.status}
        deletedAt={params.row.deletedAt}
        onActionComplete={onActionComplete}
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
          columns={getColumns(viewMode, onActionComplete)}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50]}
          getRowId={(row) => row.id} 
        />
      </Box>
    </Box>
  );
} 