import { useState } from "react";
import {
  DataGrid,
  GridColDef,
  GridValueGetterParams,
  GridRenderCellParams,
} from "@mui/x-data-grid";
import {
  IconButton,
  Button,
  Box,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  MoreVert as MoreIcon,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { Convention } from "@prisma/client";
import ConventionActions from "./ConventionActions";
import BulkActions from "./BulkActions";

const columns: GridColDef[] = [
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
    valueGetter: (params: GridValueGetterParams) =>
      new Date(params.row.startDate).toLocaleDateString(),
  },
  {
    field: "endDate",
    headerName: "End Date",
    width: 130,
    valueGetter: (params: GridValueGetterParams) =>
      new Date(params.row.endDate).toLocaleDateString(),
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
      />
    ),
  },
];

export default function ConventionList() {
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: conventions, isLoading } = useQuery<Convention[]>({
    queryKey: ["conventions", paginationModel],
    queryFn: async () => {
      const response = await fetch(
        `/api/conventions?page=${paginationModel.page}&pageSize=${paginationModel.pageSize}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch conventions");
      }
      return response.json();
    },
  });

  const handleSelectionChange = (newSelection: string[]) => {
    setSelectedIds(newSelection);
  };

  return (
    <Box>
      <BulkActions
        selectedIds={selectedIds}
        onActionComplete={() => setSelectedIds([])}
      />
      <Box sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={conventions || []}
          columns={columns}
          loading={isLoading}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50]}
          checkboxSelection
          onRowSelectionModelChange={handleSelectionChange}
          rowSelectionModel={selectedIds}
          getRowId={(row) => row.id}
        />
      </Box>
    </Box>
  );
} 