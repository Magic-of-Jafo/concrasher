import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  LinearProgress,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ConventionStatus } from "@prisma/client";

interface BulkActionsProps {
  selectedIds: string[];
  onActionComplete: () => void;
}

export default function BulkActions({
  selectedIds,
  onActionComplete,
}: BulkActionsProps) {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ConventionStatus>(
    ConventionStatus.DRAFT
  );

  const bulkActionMutation = useMutation({
    mutationFn: async ({
      action,
      status,
    }: {
      action: "delete" | "status";
      status?: ConventionStatus;
    }) => {
      const response = await fetch("/api/conventions/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          conventionIds: selectedIds,
          status,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to perform bulk action");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conventions"] });
      setDeleteDialogOpen(false);
      setStatusDialogOpen(false);
      onActionComplete();
    },
  });

  const handleBulkDelete = () => {
    bulkActionMutation.mutate({ action: "delete" });
  };

  const handleBulkStatusChange = () => {
    bulkActionMutation.mutate({ action: "status", status: selectedStatus });
  };

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <>
      <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
        <Button
          variant="outlined"
          color="error"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={bulkActionMutation.isPending}
        >
          Delete Selected
        </Button>
        <Button
          variant="outlined"
          onClick={() => setStatusDialogOpen(true)}
          disabled={bulkActionMutation.isPending}
        >
          Change Status
        </Button>
      </Box>

      {bulkActionMutation.isPending && (
        <LinearProgress sx={{ mb: 2 }} />
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Conventions</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedIds.length} selected
            convention(s)? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleBulkDelete}
            color="error"
            disabled={bulkActionMutation.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
      >
        <DialogTitle>Change Convention Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={selectedStatus}
              label="Status"
              onChange={(e) =>
                setSelectedStatus(e.target.value as ConventionStatus)
              }
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
          <Button
            onClick={handleBulkStatusChange}
            color="primary"
            disabled={bulkActionMutation.isPending}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 