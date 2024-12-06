
import React from 'react';
import { Box, Label } from '@airtable/blocks/ui';

const CustomRecordCard = ({ record }) => {
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
            onClick={() => window.open("https://airtable.com/appl4vACcHhRlcu6Z/tblfuuWvtcpA4Texv/viwHbrhprBhVOOpLN/reck4M1SQ0KzlEWGu?copyLinkToCellOrRecordOrigin=gridView&blocks=hide", "_blank")}
            style={{ cursor: 'pointer' }}
        >
            <Label size="large" marginBottom={2}>
                {record.fields.Name}
            </Label>
        </Box>
    );
};

export default CustomRecordCard;