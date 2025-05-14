"use client";

import { useState } from "react";
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridValueGetter,
} from "@mui/x-data-grid";
import {
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Convention, ConventionStatus } from "@prisma/client";
import { useRouter } from "next/navigation";

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
    valueGetter: (params: GridValueGetter) =>
      params.row?.startDate ? new Date(params.row.startDate).toLocaleDateString() : "N/A",
  },
  {
    field: "endDate",
    headerName: "End Date",
    width: 130,
    valueGetter: (params: GridValueGetter) =>
      params.row?.endDate ? new Date(params.row.endDate).toLocaleDateString() : "N/A",
  },
  {
    field: "organizer",
    headerName: "Organizer",
    width: 150,
    valueGetter: (params: GridValueGetter) => params.row?.organizer?.name || "N/A",
  },
  {
    field: "actions",
    headerName: "Actions",
    width: 100,
    sortable: false,
    renderCell: (params: GridRenderCellParams) => (
      <AdminConventionActions convention={params.row} />
    ),
  },
];

interface AdminConventionActionsProps {
  convention: Convention;
}

function AdminConventionActions({ convention }: AdminConventionActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    router.push(`/conventions/${convention.id}/edit`);
  };

  const handleViewOrganizer = () => {
    handleMenuClose();
    router.push(`/admin/users/${convention.organizerUserId}`);
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/conventions/${convention.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete convention");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-conventions"] });
      setDeleteDialogOpen(false);
      setSnackbar({
        open: true,
        message: "Convention deleted successfully",
        severity: "success",
      });
    },
    onError: () => {
      setSnackbar({
        open: true,
        message: "Failed to delete convention",
        severity: "error",
      });
    },
  });

  const handleDelete = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={handleMenuOpen}
        aria-label="convention actions"
      >
        <MoreIcon />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleViewOrganizer}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Organizer</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Convention</DialogTitle>
        <DialogContent>
          Are you sure you want to delete "{convention.name}"? This action cannot
          be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default function AdminConventionList() {
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  const { data: conventions, isLoading } = useQuery<{
    data: Convention[];
    total: number;
  }>({
    queryKey: ["admin-conventions", paginationModel],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/conventions?page=${paginationModel.page}&pageSize=${paginationModel.pageSize}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch conventions");
      }
      return response.json();
    },
  });

  return (
    <Box sx={{ height: 600, width: "100%" }}>
      <DataGrid
        rows={conventions?.data || []}
        columns={columns}
        loading={isLoading}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[10, 25, 50]}
        rowCount={conventions?.total || 0}
        paginationMode="server"
        getRowId={(row) => row.id}
      />
    </Box>
  );
} 