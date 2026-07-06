'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';

export default function AiSettingsForm() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [maskedKey, setMaskedKey] = useState<string | null>(null);
    const [keyConfigured, setKeyConfigured] = useState(false);
    const [newKey, setNewKey] = useState('');
    const [model, setModel] = useState('');
    const [models, setModels] = useState<string[]>([]);
    const [modelsError, setModelsError] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadModels = useCallback(async () => {
        setModelsError(null);
        try {
            const res = await fetch('/api/admin/settings/ai/models');
            const json = await res.json();
            if (!res.ok) throw new Error(json.detail || json.error || 'Failed to load models');
            setModels(json.models);
        } catch (err) {
            setModels([]);
            setModelsError(err instanceof Error ? err.message : 'Failed to load models');
        }
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/admin/settings/ai');
                const json = await res.json();
                if (res.ok) {
                    setMaskedKey(json.maskedKey);
                    setKeyConfigured(json.keyConfigured);
                    setModel(json.model);
                    if (json.keyConfigured) await loadModels();
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [loadModels]);

    const save = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const payload: { apiKey?: string; model?: string } = {};
            if (newKey.trim()) payload.apiKey = newKey.trim();
            if (model) payload.model = model;

            const res = await fetch('/api/admin/settings/ai', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Save failed');

            setMaskedKey(json.maskedKey);
            setKeyConfigured(json.keyConfigured);
            setModel(json.model);
            setNewKey('');
            setMessage({ type: 'success', text: 'AI settings saved.' });
            if (json.keyConfigured) await loadModels();
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <CircularProgress size={28} />;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 600 }}>
            <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {keyConfigured
                        ? `OpenAI key configured (${maskedKey}). Enter a new key to replace it.`
                        : 'No OpenAI key configured yet. AI features are disabled until one is saved.'}
                </Typography>
                <TextField
                    fullWidth
                    type="password"
                    label={keyConfigured ? 'Replace OpenAI API key' : 'OpenAI API key'}
                    placeholder="sk-..."
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    autoComplete="off"
                />
            </Box>

            <Box>
                {models.length > 0 ? (
                    <FormControl fullWidth>
                        <InputLabel id="ai-model-label">Model</InputLabel>
                        <Select
                            labelId="ai-model-label"
                            label="Model"
                            value={models.includes(model) ? model : ''}
                            onChange={e => setModel(e.target.value)}
                        >
                            {models.map(id => (
                                <MenuItem key={id} value={id}>{id}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                ) : (
                    <TextField
                        fullWidth
                        label="Model"
                        value={model}
                        onChange={e => setModel(e.target.value)}
                        helperText={modelsError
                            ? `Couldn't load the model list (${modelsError}). Enter a model name manually.`
                            : 'Save a valid API key to load the model list from your OpenAI account.'}
                    />
                )}
            </Box>

            {message && <Alert severity={message.type}>{message.text}</Alert>}

            <Box>
                <Button
                    variant="contained"
                    onClick={save}
                    disabled={saving || (!newKey.trim() && !model)}
                >
                    {saving ? 'Saving…' : 'Save AI Settings'}
                </Button>
            </Box>
        </Box>
    );
}
