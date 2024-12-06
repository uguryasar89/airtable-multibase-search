import { initializeBlock, Label, Select, Box, Button } from '@airtable/blocks/ui';
import React, { useEffect, useState } from 'react';
import { globalConfig } from '@airtable/blocks';
import config from '../config'; // Import the config

const apiToken = config.apiToken; // Get the apiToken from config

function PaymentPlans() {
    const [bases, setBases] = useState([]);
    const [tables, setTables] = useState([]);
    const [table, setTable] = useState('');
    const [value, setValue] = useState('');
    const [records, setRecords] = useState([]);

    useEffect(() => {
        const selectedBase = globalConfig.get('selectedBase');
        const selectedTable = globalConfig.get('selectedTable');
        
        if (selectedBase && selectedTable) {
            document.getElementById('baseSelect').style.display = 'none';
            document.getElementById('tableSelect').style.display = 'none';
            document.getElementById('searchDiv').style.display = 'flex';
        } else if (selectedBase) {
            fetchTables(selectedBase);
        } else {
            fetchBases();
        }
    }, []);

    const fetchBases = () => {
        fetch('https://api.airtable.com/v0/meta/bases', {
            method: 'GET',
            headers: {
                'Authorization': apiToken
            }
        })
        .then(response => response.json())
        .then(data => {
            const newBases = data.bases.map(base => ({ value: base.id, label: base.name }));
            newBases.unshift({ value: '', label: 'Base Seçin' });
            setBases(newBases);
            
            if (newBases.length > 0) {
                setValue(newBases[0].value);
            }
        })
        .catch(error => console.error('Error fetching bases:', error));
    };

    const fetchTables = (baseId) => {
        globalConfig.setAsync('selectedBase', baseId)
            .then(() => {
                document.getElementById('baseSelect').style.display = 'none'; // Hide the div by setting display to 'none'
                document.getElementById('tableSelect').style.display = 'flex'; // Show the div by setting display to 'flex'
            })
            .catch(error => {
                console.error('Error saving base:', error);
            });

        fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
            method: 'GET',
            headers: {
                'Authorization': apiToken
            }
        })
        .then(response => response.json())
        .then(data => {
            const newTables = data.tables.map(table => ({ value: table.id, label: table.name }));
            newTables.unshift({ value: '', label: 'Tablo Seçin' });
            setTables(newTables);
            
            if (newTables.length > 0) {
                setTable(newTables[0].value);
            }
        })
        .catch(error => console.error('Error fetching tables:', error));
    };

    const fetchRecords = (searchText) => {
        let selectedTable = globalConfig.get('selectedTable');
        let selectedBase = globalConfig.get('selectedBase');
        let URL = 'https://api.airtable.com/v0/' + selectedBase + '/' + selectedTable + '?filterByFormula=' + encodeURIComponent('FIND("' + searchText + '",{Name})') + '&maxRecords=1';
        alert(URL);
        fetch(URL, {
            method: 'GET',
            headers: {
                'Authorization': apiToken
            }
        })
        .then(response => response.json())
        .then(data => {
            setRecords(data.records);
            globalConfig.setAsync('records', data.records);
            document.getElementById('recordsDiv').style.display = 'flex'; // Show the div by setting display to 'flex'
            document.getElementById('searchDiv').style.display = 'none'; // Hide the div by setting display to 'none'
        })
        .catch(error => console.error('Error fetching tables:', error));
    }
    
    const saveTable = () => {
        globalConfig.setAsync('selectedTable', table)
            .then(() => {
                document.getElementById('tableSelect').style.display = 'none'; // Hide the div by setting display to 'none'
                document.getElementById('searchDiv').style.display = 'flex'; // Show the div by setting display to 'flex'
            })
            .catch(error => {
                console.error('Error saving table:', error);
            });
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f4f8', padding: '20px' }}>
            <div id="baseSelect" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
                <Label htmlFor="base-select" style={{ marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>Arşiv Kayıtlarının Olduğu Base'i Seçiniz</Label>
                <Select
                    id="base-select"
                    options={bases}
                    value={value}
                    onChange={newValue => setValue(newValue)}
                    width="320px"
                    style={{ marginBottom: '20px' }}
                />
                <Button
                    onClick={() => fetchTables(value)}
                    variant="primary"
                    style={{ backgroundColor: '#007bff', color: '#ffffff', padding: '10px 20px', borderRadius: '4px' }}
                >
                    Save Selected Base
                </Button>
            </div>
            <div id="tableSelect" style={{ display: 'none', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
                <Label htmlFor="table-select" style={{ marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>Arşiv Kayıtlarının Olduğu Tabloyu Seçiniz</Label>
                <Select
                    id="table-select"
                    options={tables}
                    value={table}
                    onChange={newValue => setTable(newValue)}
                    width="320px"
                    style={{ marginBottom: '20px' }}
                />
                <Button
                    onClick={saveTable}
                    variant="primary"
                    style={{ backgroundColor: '#007bff', color: '#ffffff', padding: '10px 20px', borderRadius: '4px' }}
                >
                    Save Selected Table
                </Button>
            </div>
            <div id='searchDiv' style={{ display: 'none', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', marginTop: '20px' }}>
                <Label htmlFor="text-input" style={{ textAlign: 'center' }}>Aranacak metni girin</Label>
                <input
                    type="text"
                    id="text-input"
                    onKeyPress={(event) => {
                    if (event.key === 'Enter') {
                        const searchText = event.target.value;
                        fetchRecords(searchText);
                    }
                    }}
                    style={{ width: '320px', padding: '8px', marginTop: '20px', textAlign: 'center' }}
                />
            </div>
            <div id='recordsDiv' style={{ display: 'none', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', marginTop: '20px' }}>
                {records && records.length > 0 ? (
                    records.map(record => (
                        <CustomRecordCard key={record.id} record={record} />
                    ))
                ) : (
                    <Label>No records found</Label>
                )}
            </div>
        </div>
    );
}

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

initializeBlock(() => <PaymentPlans />);
