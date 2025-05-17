import { initializeBlock, Label, Select, Button } from '@airtable/blocks/ui';
import React, { useEffect, useState } from 'react';
import { globalConfig, base as currentBase } from '@airtable/blocks';
import config from '../config'; 
import CustomRecordCard from './CustomRecordCard'; 
import { hideElement, showElement } from './util';
import './styles.css';

const apiToken = config.apiToken;

function sortRecordsByName(records) {
    return records.sort((a, b) => {
        // Add more robust name handling
        const nameA = a.fields && (a.fields.Name || a.fields.name) ? 
            (a.fields.Name || a.fields.name).toLowerCase() : '';
        const nameB = b.fields && (b.fields.Name || b.fields.name) ? 
            (b.fields.Name || b.fields.name).toLowerCase() : '';
        
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });
}

const sortParams = new URLSearchParams({
    'sort[0][field]': 'Name',
    'sort[0][direction]': 'asc'
}).toString();

function PaymentPlans() {
    const [bases, setBases] = useState([]);
    const [tables, setTables] = useState([]);
    const [table, setTable] = useState('');
    const [value, setValue] = useState('');
    const [records, setRecords] = useState([]);
    const [offsets, setOffsets] = useState({});
    const [currentPageOffset, setCurrentPageOffset] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [hasNextPage, setHasNextPage] = useState(false);
    const [hasPreviousPage, setHasPreviousPage] = useState(false);
    const [loading, setLoading] = useState(false);
    const [availableTables, setAvailableTables] = useState([]);
    const [selectedCurrentTable, setSelectedCurrentTable] = useState('');
    const [showCurrentBaseTables, setShowCurrentBaseTables] = useState(false);

    useEffect(() => {
        const selectedBase = globalConfig.get('selectedBase');
        const selectedTable = globalConfig.get('selectedTable');
        const selectedView = globalConfig.get('selectedView');
        const selectedCurrentTable = globalConfig.get('selectedCurrentTable');
        
        // Get available tables from the current base
        const tables = currentBase.tables;
        setAvailableTables(tables.map(table => ({
            value: table.id,
            label: table.name,
            view: table.primaryView ? table.primaryView.id : (table.views.length > 0 ? table.views[0].id : '')
        })));
        
        if (selectedCurrentTable) {
            setSelectedCurrentTable(selectedCurrentTable);
        } else if (tables.length > 0) {
            setSelectedCurrentTable(tables[0].id);
        }
        
        if (selectedBase && selectedTable && selectedView) {
            hideElement('baseSelect');
            hideElement('tableSelect');
            showElement('searchDiv');
            if (selectedCurrentTable) {
                setShowCurrentBaseTables(false);
            } else {
                setShowCurrentBaseTables(true);
            }
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

    const fetchRecordsFromArchiveBase = async (searchText, offset = null) => {
        let selectedTable = globalConfig.get('selectedTable');
        let selectedBase = globalConfig.get('selectedBase');

        let URL = `https://api.airtable.com/v0/${selectedBase}/${selectedTable}?filterByFormula=${encodeURIComponent(`FIND(LOWER("${searchText}"), LOWER({Name}))`)}&${sortParams}`;

        if (offset) {
            URL += `&offset=${encodeURIComponent(offset)}`;
        }

        try {
            const response = await fetch(URL, {
                method: 'GET',
                headers: {
                    'Authorization': apiToken
                }
            });
            const data = await response.json();

            // Mark records as from archive
            const archiveRecords = data.records.map(record => ({
                ...record,
                isArchive: true // Add flag for archive records
            }));
            
            return { records: archiveRecords, offset: data.offset };
        } catch (error) {
            console.error('Error fetching archive records:', error);
            return { records: [], offset: null };
        }
    };

    const fetchRecordsFromCurrentBase = async (searchText) => {
        try {
            if (!selectedCurrentTable) {
                return { records: [] };
            }

            const table = currentBase.getTableById(selectedCurrentTable);
            if (!table) {
                return { records: [] };
            }

            const query = await table.selectRecordsAsync({
                sorts: [{ field: 'Name', direction: 'asc' }],
                filterByFormula: `FIND(LOWER("${searchText}"), LOWER({Name}))`
            });

            // Convert Airtable block records to the same format as API records
            const currentRecords = query.records.map(record => {
                try {
                    const fields = record.getCellValuesByFieldId();
                    // Make sure Name field exists in a consistent format
                    if (!fields.Name && fields.name) {
                        fields.Name = fields.name;
                    }
                    return {
                        id: record.id,
                        fields: fields,
                        isArchive: false,
                        createdTime: record.createdTime
                    };
                } catch (error) {
                    console.error("Error processing record:", error);
                    return {
                        id: record.id,
                        fields: { Name: "Error loading record" },
                        isArchive: false,
                        createdTime: record.createdTime || new Date().toISOString()
                    };
                }
            });

            return { records: currentRecords };
        } catch (error) {
            console.error('Error fetching current base records:', error);
            return { records: [] };
        }
    };

    const fetchRecords = async (searchText, offset = null) => {
        setLoading(true);
        hideElement('pagination');
        setHasPreviousPage(false);
        
        try {
            // Fetch records from both bases
            const [archiveResult, currentResult] = await Promise.all([
                fetchRecordsFromArchiveBase(searchText, offset),
                fetchRecordsFromCurrentBase(searchText)
            ]);

            // Set offset for pagination
            if (archiveResult.offset) {
                setOffsets({ ...offsets, [2]: archiveResult.offset });
                setCurrentPageOffset(archiveResult.offset);
                setHasNextPage(true);
                showElement('pagination');
            } else {
                setHasNextPage(false);
            }

            // Combine records from both sources
            const allRecords = [...archiveResult.records, ...currentResult.records];
            
            // Deduplicate records based on Name field
            const uniqueRecords = [];
            const recordNames = new Set();

            allRecords.forEach(record => {
                const name = record.fields.Name;
                if (name && !recordNames.has(name)) {
                    recordNames.add(name);
                    uniqueRecords.push(record);
                }
            });

            const sortedRecords = sortRecordsByName(uniqueRecords);
            setRecords(sortedRecords);
            globalConfig.setAsync('records', sortedRecords);
            showElement('recordsDiv');
            document.getElementById('text-input').value = '';
            setCurrentPage(1);
        } catch (error) {
            console.error('Error fetching records:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchNext = async () => {
        setLoading(true);
        
        try {
            // For pagination, we'll only paginate through the archive records
            // as the current base records are fetched in full
            const archiveResult = await fetchRecordsFromArchiveBase(searchText, offsets[currentPage + 1]);
            const currentResult = await fetchRecordsFromCurrentBase(searchText);
            
            setHasPreviousPage(true);
            
            // Update offset for next page if available
            if (archiveResult.offset) {
                setOffsets({ ...offsets, [currentPage + 2]: archiveResult.offset });
                setCurrentPageOffset(archiveResult.offset);
                setHasNextPage(true);
                showElement('pagination');
            } else {
                setHasNextPage(false);
            }

            // Combine and deduplicate records
            const allRecords = [...archiveResult.records, ...currentResult.records];
            const uniqueRecords = [];
            const recordNames = new Set();

            allRecords.forEach(record => {
                const name = record.fields.Name;
                if (name && !recordNames.has(name)) {
                    recordNames.add(name);
                    uniqueRecords.push(record);
                }
            });

            const sortedRecords = sortRecordsByName(uniqueRecords);
            setRecords(sortedRecords);
            globalConfig.setAsync('records', sortedRecords);
            document.getElementById('text-input').value = '';
            
            setCurrentPage(page => page + 1);
        } catch (error) {
            console.error('Error fetching next page:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const fetchPrevious = async () => {
        setLoading(true);
        
        try {
            const offset = currentPage > 2 ? offsets[currentPage - 1] : null;
            
            // Fetch previous page of archive records
            const archiveResult = await fetchRecordsFromArchiveBase(searchText, offset);
            const currentResult = await fetchRecordsFromCurrentBase(searchText);
            
            // Update pagination state
            if (currentPage <= 2) {
                setHasPreviousPage(false);
            } else {
                setHasPreviousPage(true);
            }
            
            setHasNextPage(true);
            
            // Combine and deduplicate records
            const allRecords = [...archiveResult.records, ...currentResult.records];
            const uniqueRecords = [];
            const recordNames = new Set();

            allRecords.forEach(record => {
                const name = record.fields.Name;
                if (name && !recordNames.has(name)) {
                    recordNames.add(name);
                    uniqueRecords.push(record);
                }
            });

            const sortedRecords = sortRecordsByName(uniqueRecords);
            setRecords(sortedRecords);
            globalConfig.setAsync('records', sortedRecords);
            document.getElementById('text-input').value = '';
            
            setCurrentPage(page => page - 1);
        } catch (error) {
            console.error('Error fetching previous page:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveTable = () => {
        const selectedTableObj = tables.find(t => t.value === table);
        globalConfig.setAsync('selectedTable', selectedTableObj.value)
            .then(() => {
                globalConfig.setAsync('selectedView', selectedTableObj.view);
                hideElement('tableSelect'); 
                showElement('searchDiv');
                setShowCurrentBaseTables(true);
            })
            .catch(error => {
                console.error('Error saving table:', error);
            });
    };
    
    const saveCurrentBaseTable = () => {
        globalConfig.setAsync('selectedCurrentTable', selectedCurrentTable)
            .then(() => {
                setShowCurrentBaseTables(false);
                showElement('searchDiv');
            })
            .catch(error => {
                console.error('Error saving current table:', error);
            });
    };

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
            {showCurrentBaseTables && (
                <div id="currentBaseTableSelect" className="select-container">
                    <Label htmlFor="current-table-select" className="label">Mevcut Base'deki Tabloyu Seçiniz</Label>
                    <Select
                        id="current-table-select"
                        options={availableTables}
                        value={selectedCurrentTable}
                        onChange={newValue => setSelectedCurrentTable(newValue)}
                        width="320px"
                        style={{ marginBottom: '20px' }}
                    />
                    <Button
                        onClick={saveCurrentBaseTable}
                        variant="primary"
                        className="button"
                    >
                        Save Selected Current Table
                    </Button>
                </div>
            )}
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
                {loading && <div className="loading">Searching...</div>}
            </div>
            <div id='recordsDiv' className="records-container">
                {records && records.length > 0 ? (
                    records.map(record => {
                        // Add safety check
                        if (!record || !record.id) {
                            console.warn("Invalid record found:", record);
                            return null;
                        }
                        return (
                            <CustomRecordCard 
                                key={record.id} 
                                record={record} 
                                selectedBase={record.isArchive ? globalConfig.get('selectedBase') : currentBase.id}
                                selectedTable={record.isArchive ? globalConfig.get('selectedTable') : selectedCurrentTable}
                                selectedView={record.isArchive ? globalConfig.get('selectedView') : 
                                    availableTables.find(t => t.value === selectedCurrentTable)?.view || ''}
                                isArchive={record.isArchive}
                            />
                        );
                    }).filter(Boolean)  // Remove null entries
                ) : (
                    <Label>No records found</Label>
                )}
            </div>
            <div id="pagination" className="pagination" style={{ display: 'none' }}>
                <Button
                    onClick={fetchPrevious}
                    disabled={!hasPreviousPage || loading}
                >
                    Previous
                </Button>
                <Button
                    onClick={fetchNext}
                    disabled={!hasNextPage || loading}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}

initializeBlock(() => <PaymentPlans />);
