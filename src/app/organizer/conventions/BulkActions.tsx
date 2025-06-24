"use client";

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
      // API route for bulk actions might need review if it was /api/conventions/
      // Assuming it's general enough or already correct.
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
      queryClient.invalidateQueries({ queryKey: ["deletedConventions"] }); // Refresh both views
      setDeleteDialogOpen(false);
      setStatusDialogOpen(false);
      onActionComplete();
      // router.refresh() might be needed if global state changes aren't picked up by query invalidation alone
    },
    onError: (error) => {
      // Add error handling, e.g., snackbar
      console.error("Bulk action failed:", error);
      // Potentially show a snackbar message to the user
    }
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
          Delete Selected (Trash)
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
        <DialogTitle>Move Selected to Trash?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to move {selectedIds.length} selected
            convention(s) to the trash? They can be restored later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleBulkDelete}
            color="error"
            disabled={bulkActionMutation.isPending}
          >
            Move to Trash
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