import React, { useState } from 'react';
import { ConflictResult, fileDetectionService, ScanResult } from '../services/fileDetectionService';

interface FileDetectionProps {
    postId: number;
    onFilesProcessed: () => void;
}

const FileDetection: React.FC<FileDetectionProps> = ({ postId, onFilesProcessed }) => {
    const [scanning, setScanning] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [conflicts, setConflicts] = useState<ConflictResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleScan = async () => {
        setScanning(true);
        setError(null);
        try {
            const result = await fileDetectionService.scanPostFiles(postId);
            setScanResult(result);

            // Also get conflicts
            const conflictResult = await fileDetectionService.getFileConflicts(postId);
            setConflicts(conflictResult);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to scan files');
        } finally {
            setScanning(false);
        }
    };

    const handleProcess = async () => {
        setProcessing(true);
        setError(null);
        try {
            const result = await fileDetectionService.processPostFiles(postId);
            console.log('Processing result:', result);
            onFilesProcessed(); // Refresh the media gallery

            // Clear results after successful processing
            setScanResult(null);
            setConflicts(null);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to process files');
        } finally {
            setProcessing(false);
        }
    };

    const getClassificationIcon = (classification: string) => {
        switch (classification) {
            case 'new_original': return '🆕';
            case 'new_stage': return '➕';
            case 'duplicate_original':
            case 'duplicate_stage': return '🔄';
            case 'invalid_suffix': return '⚠️';
            case 'orphan_stage': return '🔗';
            default: return '❓';
        }
    };

    const getClassificationColor = (classification: string) => {
        switch (classification) {
            case 'new_original': return '#10b981';
            case 'new_stage': return '#3b82f6';
            case 'duplicate_original':
            case 'duplicate_stage': return '#f59e0b';
            case 'invalid_suffix': return '#ef4444';
            case 'orphan_stage': return '#8b5cf6';
            default: return '#6b7280';
        }
    };

    if (!scanResult) {
        return (
            <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                    File Detection
                </h3>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                    Scan the post directory to automatically detect and classify media files based on their naming convention.
                </p>
                <button
                    onClick={handleScan}
                    disabled={scanning}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: scanning ? '#9ca3af' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: scanning ? 'not-allowed' : 'pointer',
                        fontSize: '14px'
                    }}
                >
                    {scanning ? 'Scanning...' : '🔍 Scan Files'}
                </button>
                {error && (
                    <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '4px' }}>
                        {error}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                    File Detection Results
                </h3>
                <div>
                    <button
                        onClick={handleScan}
                        disabled={scanning}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: scanning ? '#9ca3af' : '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: scanning ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            marginRight: '8px'
                        }}
                    >
                        {scanning ? 'Scanning...' : '🔄 Rescan'}
                    </button>
                    <button
                        onClick={handleProcess}
                        disabled={processing || (conflicts?.conflict_count ?? 0) > 0}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: processing || (conflicts?.conflict_count ?? 0) > 0 ? '#9ca3af' : '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: processing || (conflicts?.conflict_count ?? 0) > 0 ? 'not-allowed' : 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        {processing ? 'Processing...' : '✅ Process Files'}
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    Summary: {scanResult.total_files} files found
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {Object.entries(scanResult.grouped_classifications).map(([key, files]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>{getClassificationIcon(key)}</span>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                {key.replace('_', ' ')}: {files.length}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Conflicts Warning */}
            {conflicts && conflicts.conflict_count > 0 && (
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
                        ⚠️ {conflicts.conflict_count} conflicts need attention
                    </div>
                    <div style={{ fontSize: '12px', color: '#92400e' }}>
                        Please resolve conflicts before processing files.
                    </div>
                </div>
            )}

            {/* Detailed Results */}
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {Object.entries(scanResult.grouped_classifications).map(([key, files]) => (
                    files.length > 0 && (
                        <div key={key} style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px', color: getClassificationColor(key) }}>
                                {getClassificationIcon(key)} {key.replace('_', ' ').charAt(0).toUpperCase() + key.replace('_', ' ').slice(1)} ({files.length})
                            </div>
                            {files.map((file, index) => (
                                <div key={index} style={{ fontSize: '12px', color: '#6b7280', marginLeft: '20px', marginBottom: '2px' }}>
                                    📄 {file.filename}
                                    {file.stage && <span style={{ marginLeft: '8px', color: getClassificationColor(key) }}>(Stage: {file.stage})</span>}
                                </div>
                            ))}
                        </div>
                    )
                ))}
            </div>

            {error && (
                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '4px' }}>
                    {error}
                </div>
            )}
        </div>
    );
};

export default FileDetection;
