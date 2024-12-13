import React from 'react';
import { Box, Label } from '@airtable/blocks/ui';

const CustomRecordCard = ({ record, selectedBase, selectedTable, selectedView }) => {

    const handleClick = () => {
        const url = `https://airtable.com/${selectedBase}/${selectedTable}/${selectedView}/${record.id}?copyLinkToCellOrRecordOrigin=gridView&blocks=hide`;
        window.open(url, "_blank");
    };

    return (
        <Box
            border="default"
            borderRadius="large"
            padding={3}
            marginBottom={2}
            backgroundColor="white"
            width="100%"
            maxWidth="400px"
            boxShadow="0 2px 4px rgba(0, 0, 0, 0.1)"
            onClick={handleClick}
            style={{ cursor: 'pointer' }}
        >
            <Label size="large" marginBottom={2}>
                {record.fields.Name}
            </Label>
        </Box>
    );
};

export default CustomRecordCard;