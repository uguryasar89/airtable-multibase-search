import { initializeBlock, Label, Select, Button } from '@airtable/blocks/ui';
import React, { useEffect, useState } from 'react';
import { globalConfig } from '@airtable/blocks';
import config from '../config'; 
import CustomRecordCard from './CustomRecordCard'; 
import { hideElement, showElement } from './util';
import './styles.css';

const apiToken = config.apiToken; 

function PaymentPlans() {
    const [bases, setBases] = useState([]);
    const [tables, setTables] = useState([]);
    const [table, setTable] = useState('');
    const [value, setValue] = useState('');
    const [records, setRecords] = useState([]);
    const [offsets, setOffsets] = useState({});
    const [currentPage, setCurrentPage] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [hasNextPage, setHasNextPage] = useState(false);
    const [hasPreviousPage, setHasPreviousPage] = useState(false);

    useEffect(() => {
        const selectedBase = globalConfig.get('selectedBase');
        const selectedTable = globalConfig.get('selectedTable');
        const selectedView = globalConfig.get('selectedView');
        
        if (selectedBase && selectedTable && selectedView) {
            hideElement('baseSelect');
            hideElement('tableSelect');
            showElement('searchDiv');
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
                hideElement('baseSelect');
                showElement('tableSelect');
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
            const newTables = data.tables.map(table => ({ value: table.id, label: table.name, view: table.views[0].id }));
            newTables.unshift({ value: '', label: 'Tablo Seçin' });
            setTables(newTables);
            
            if (newTables.length > 0) {
                setTable(newTables[0].value);
            }
        })
        .catch(error => console.error('Error fetching tables:', error));
    };

    const fetchRecords = (searchText, offset) => {
        let selectedTable = globalConfig.get('selectedTable');
        let selectedBase = globalConfig.get('selectedBase');

        hideElement('pagination');
        setHasPreviousPage(false);

        let URL = `https://api.airtable.com/v0/${selectedBase}/${selectedTable}?filterByFormula=${encodeURIComponent(`FIND(LOWER("${searchText}"), LOWER({Name}))`)}`;

        if (offset) {
            URL += `&offset=${encodeURIComponent(offset)}`;
        }

        fetch(URL, {
            method: 'GET',
            headers: {
                'Authorization': apiToken
            }
        })
        .then(response => response.json())
        .then(data => {
            const uniqueRecords = [];
            const recordNames = new Set();

            data.records.forEach(record => {
                if (!recordNames.has(record.fields.Name)) {
                    recordNames.add(record.fields.Name);
                    uniqueRecords.push(record);
                }
            });

            setRecords(uniqueRecords);
            globalConfig.setAsync('records', uniqueRecords);
            showElement('recordsDiv');
            document.getElementById('text-input').value = '';

            setCurrentPage(1);

            if (data.offset) {
                setOffsets({ ...offsets, [2]: data.offset });
                setHasNextPage(true);
                showElement('pagination');
            }

        })
        .catch(error => console.error('Error fetching records:', error));
    }

    const fetchNext = () => {
        let selectedTable = globalConfig.get('selectedTable');
        let selectedBase = globalConfig.get('selectedBase');
        let offset = offsets[currentPage + 1];

        let URL = `https://api.airtable.com/v0/${selectedBase}/${selectedTable}?filterByFormula=${encodeURIComponent(`FIND(LOWER("${searchText}"), LOWER({Name}))`)}&offset=${encodeURIComponent(offset)}`;

        fetch(URL, {
            method: 'GET',
            headers: {
                'Authorization': apiToken
            }
        })
        .then(response => response.json())
        .then(data => {
            const uniqueRecords = [];
            const recordNames = new Set();

            data.records.forEach(record => {
                if (!recordNames.has(record.fields.Name)) {
                    recordNames.add(record.fields.Name);
                    uniqueRecords.push(record);
                }
            });

            setHasPreviousPage(true);

            setRecords(uniqueRecords);
            globalConfig.setAsync('records', uniqueRecords);
            document.getElementById('text-input').value = '';

            setCurrentPage(page => page + 1);
            console.log(data.offset);

            if (data.offset) {
                setOffsets({ ...offsets, [currentPage + 2]: data.offset });
                setHasNextPage(true);
                showElement('pagination');
            } else {
                setHasNextPage(false);
            }

        })
        .catch(error => console.error('Error fetching records:', error));

    }
    
    const fetchPrevious = () => {
        let selectedTable = globalConfig.get('selectedTable');
        let selectedBase = globalConfig.get('selectedBase');
        let offset = offsets[currentPage - 1];

        let URL = `https://api.airtable.com/v0/${selectedBase}/${selectedTable}?filterByFormula=${encodeURIComponent(`FIND(LOWER("${searchText}"), LOWER({Name}))`)}`;

        if (offset) {
            URL += `&offset=${encodeURIComponent(offset)}`;
        } else {
            setHasPreviousPage(false);
        }

        fetch(URL, {
            method: 'GET',
            headers: {
                'Authorization': apiToken
            }
        })
        .then(response => response.json())
        .then(data => {
            const uniqueRecords = [];
            const recordNames = new Set();

            data.records.forEach(record => {
                if (!recordNames.has(record.fields.Name)) {
                    recordNames.add(record.fields.Name);
                    uniqueRecords.push(record);
                }
            });

            setHasNextPage(true);

            setRecords(uniqueRecords);
            globalConfig.setAsync('records', uniqueRecords);
            document.getElementById('text-input').value = '';

            setCurrentPage(page => page - 1);

        })
        .catch(error => console.error('Error fetching records:', error));
    }

    const saveTable = () => {
        const selectedTableObj = tables.find(t => t.value === table);
        globalConfig.setAsync('selectedTable', selectedTableObj.value)
            .then(() => {
                globalConfig.setAsync('selectedView', selectedTableObj.view);
                hideElement('tableSelect'); 
                showElement('searchDiv');
            })
            .catch(error => {
                console.error('Error saving table:', error);
            });
    }

    return (
        <div className="container">
            <div id="baseSelect" className="select-container">
                <Label htmlFor="base-select" className="label">Arşiv Kayıtlarının Olduğu Base'i Seçiniz</Label>
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
                    className="button"
                >
                    Save Selected Base
                </Button>
            </div>
            <div id="tableSelect" className="select-container" style={{ display: 'none' }}>
                <Label htmlFor="table-select" className="label">Arşiv Kayıtlarının Olduğu Tabloyu Seçiniz</Label>
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
                    className="button"
                >
                    Save Selected Table
                </Button>
            </div>
            <div id='searchDiv' className="select-container" style={{ display: 'none', marginTop: '20px' }}>
                <Label htmlFor="text-input" style={{ textAlign: 'center' }}>Aranacak metni girin</Label>
                <input
                    type="text"
                    id="text-input"
                    onKeyPress={(event) => {
                        if (event.key === 'Enter') {
                            const searchText = event.target.value;
                            setSearchText(searchText); // Save the search text
                            setOffsets({}); // Clear offsets on new search
                            fetchRecords(searchText);
                            event.target.value = ''; 
                        }
                    }}
                    className="input"
                    style={{ width: '100%' }}
                />
            </div>
            <div id='recordsDiv' className="records-container">
                {records && records.length > 0 ? (
                    records.map(record => (
                        <CustomRecordCard key={record.id} record={record} selectedBase={globalConfig.get('selectedBase')} selectedTable={globalConfig.get('selectedTable')} selectedView={globalConfig.get('selectedView')} />
                    ))
                ) : (
                    <Label>No records found</Label>
                )}
                
            </div>
            <div id="pagination" className="pagination" style={{ display: 'none' }}>
                    <Button
                        onClick={() => {
                            fetchPrevious();
                        }}
                        disabled={!hasPreviousPage}
                    >
                        Previous
                    </Button>
                    <Button
                        onClick={() => {
                            fetchNext();
                        }}
                        disabled={!hasNextPage}
                    >
                        Next
                    </Button>
                </div>
        </div>
    );
}

initializeBlock(() => <PaymentPlans />);
