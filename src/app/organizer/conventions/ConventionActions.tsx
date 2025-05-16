"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  MoreVert as MoreIcon,
  Publish as PublishIcon,
  RestoreFromTrash as RestoreIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ConventionStatus } from "@prisma/client";

interface ConventionActionsProps {
  conventionId: string;
  conventionName: string;
  currentStatus: ConventionStatus;
  deletedAt?: Date | null;
  onActionComplete?: () => void;
  slug: string;
}

export default function ConventionActions({
  conventionId,
  conventionName,
  currentStatus,
  deletedAt,
  onActionComplete,
  slug,
}: ConventionActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ConventionStatus>(currentStatus);
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
    // Edit link should now be relative to /organizer/conventions/
    router.push(`/organizer/conventions/${conventionId}/edit`);
  };

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      // API route for duplication might need review if it was /api/conventions/
      // Assuming it's general enough or already correct.
      const response = await fetch(`/api/conventions/${conventionId}/duplicate`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to duplicate convention");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conventions", "all"] });
      setSnackbar({
        open: true,
        message: "Convention duplicated successfully",
        severity: "success",
      });
      if (onActionComplete) {
        onActionComplete();
      }
      router.push(`/organizer/conventions/${data.id}/edit`);
    },
    onError: () => {
      setSnackbar({
        open: true,
        message: "Failed to duplicate convention",
        severity: "error",
      });
    },
  });

  const handleDuplicate = () => {
    handleMenuClose();
    duplicateMutation.mutate();
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/organizer/conventions/${conventionId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: "Delete operation failed", 
          message: "Failed to delete convention. Please try again."
        }));
        const error = new Error(errorData.message || "Failed to delete convention");
        (error as any).status = response.status;
        (error as any).data = errorData;
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conventions"] });
      queryClient.invalidateQueries({ queryKey: ["deletedConventions"] }); // Ensure both views can be refreshed
      setDeleteDialogOpen(false);
      setSnackbar({
        open: true,
        message: "Convention moved to trash successfully",
        severity: "success",
      });
      if (onActionComplete) {
        onActionComplete();
      }
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: error.message || "Failed to delete convention",
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

  const statusMutation = useMutation({
    mutationFn: async (newStatus: ConventionStatus) => {
      // API route for status update might need review if it was /api/conventions/
      // Assuming it's general enough or already correct.
      const response = await fetch(`/api/organizer/conventions/${conventionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        // Attempt to parse error from backend if available
        const errorData = await response.json().catch(() => ({})); 
        throw new Error(errorData.error || "Failed to update convention status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conventions", "all"] });
      setStatusDialogOpen(false);
      setSnackbar({
        open: true,
        message: "Convention status updated successfully",
        severity: "success",
      });
      if (onActionComplete) {
        onActionComplete();
      }
    },
    onError: (error: Error) => {
      setSnackbar({
        open: true,
        message: error.message || "Failed to update convention status",
        severity: "error",
      });
    },
  });

  const handleStatusChange = () => {
    handleMenuClose();
    setStatusDialogOpen(true);
  };

  const confirmStatusChange = () => {
    statusMutation.mutate(selectedStatus);
  };

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/organizer/conventions/${conventionId}/restore`, {
        method: "PATCH",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: "Restore operation failed", 
          message: "Failed to restore convention. Please try again."
        }));
        const error = new Error(errorData.message || "Failed to restore convention");
        (error as any).status = response.status;
        (error as any).data = errorData;
        throw error;
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conventions"] });
      queryClient.invalidateQueries({ queryKey: ["deletedConventions"] });
      setSnackbar({
        open: true,
        message: "Convention restored successfully",
        severity: "success",
      });
      if (onActionComplete) {
        onActionComplete();
      }
    },
    onError: (error: any) => {
      let message = "Failed to restore convention. Please try again.";
      if (error.status === 409 && error.data && error.data.message) {
        message = error.data.message;
      } else if (error.message) {
        message = error.message;
      }
      setSnackbar({
        open: true,
        message: message,
        severity: "error",
      });
    },
  });

  const handleRestore = () => {
    handleMenuClose();
    restoreMutation.mutate();
  };

  const handleView = () => {
    handleMenuClose();
    router.push(`/conventions/${slug}`);
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
        {deletedAt ? (
          <MenuItem onClick={handleRestore} disabled={restoreMutation.isPending}>
            <ListItemIcon>
              <RestoreIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Restore</ListItemText>
          </MenuItem>
        ) : (
          [
            <MenuItem key="view" onClick={handleView}>
              <ListItemIcon>
                <ViewIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>View</ListItemText>
            </MenuItem>,
            <MenuItem key="edit" onClick={handleEdit}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>,
            <MenuItem key="duplicate" onClick={handleDuplicate} disabled={duplicateMutation.isPending}>
              <ListItemIcon>
                <DuplicateIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Duplicate</ListItemText>
            </MenuItem>,
            <MenuItem key="status" onClick={handleStatusChange} disabled={statusMutation.isPending}>
               <ListItemIcon>
                <PublishIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Change Status</ListItemText>
            </MenuItem>,
            <MenuItem key="delete" onClick={handleDelete} sx={{ color: "error.main" }}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" sx={{ color: "error.main" }} />
              </ListItemIcon>
              <ListItemText>Delete (Trash)</ListItemText>
            </MenuItem>,
          ]
        )}
      </Menu>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Move to Trash?</DialogTitle>
        <DialogContent>
          Are you sure you want to move the convention "{conventionName}" to the
          trash? It can be restored later.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" disabled={deleteMutation.isPending}>
            Move to Trash
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogTitle>Change Convention Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel id="status-select-label">Status</InputLabel>
            <Select
              labelId="status-select-label"
              value={selectedStatus}
              label="Status"
              onChange={(e) => setSelectedStatus(e.target.value as ConventionStatus)}
            >
              {Object.values(ConventionStatus).map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmStatusChange} color="primary" disabled={statusMutation.isPending}>
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
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