import React from 'react';
import { Box, Label } from '@airtable/blocks/ui';

const CustomRecordCard = ({ record, selectedBase, selectedTable, selectedView, isArchive }) => {
    // Safety check for record data
    if (!record || !record.fields) {
        return null;
    }
    
    const handleClick = () => {
        try {
            const url = `https://airtable.com/${selectedBase}/${selectedTable}/${selectedView}/${record.id}?copyLinkToCellOrRecordOrigin=gridView&blocks=hide`;
            window.open(url, "_blank");
        } catch (error) {
            console.error("Error opening record link:", error);
        }
    };

    // Safely get the name from fields
    const recordName = record.fields.Name || record.fields.name || "Unnamed Record";

    return (
        <Box
            border="default"
            borderRadius="large"
            padding={3}
            marginBottom={2}
            backgroundColor="white"
            width="100%"
            maxWidth="100%"
            boxShadow="0 2px 4px rgba(0, 0, 0, 0.1)"
            onClick={handleClick}
            style={{ cursor: 'pointer' }}
        >
            <Box 
                display="flex" 
                justifyContent="space-between" 
                alignItems="center"
                width="100%"
            >
                <Label size="large" style={{ 
                    wordBreak: "break-word", 
                    maxWidth: "80%" 
                }}>
                    {recordName}
                </Label>
                <Box 
                    backgroundColor={isArchive ? "#FFA500" : "#4CAF50"}
                    borderRadius="large"
                    padding="8px 12px"
                >
                    <span style={{ color: "white", fontWeight: "bold", fontSize: "12px" }}>
                        {isArchive ? "Archive" : "Current"}
                    </span>
                </Box>
            </Box>
        </Box>
    );
};

export default CustomRecordCard;