import { initializeBlock, Label, Select, Button } from '@airtable/blocks/ui';
import React, { useEffect, useState } from 'react';
import { globalConfig, base as currentBase } from '@airtable/blocks';
import config from '../config'; 
import CustomRecordCard from './CustomRecordCard'; 
import { hideElement, showElement } from './util';
import './styles.css';

const apiToken = config.apiToken;
const currentTableSearchField = config.currentTableSearchField;

function sortRecordsByName(records) {
    return records.sort((a, b) => {
        // More robust name handling that also considers configured search field for current base records
        const getDisplayName = (record) => {
            if (!record.fields) return '';
            
            // For current base records, use configured search field as the primary field
            if (!record.isArchive && record.fields[currentTableSearchField]) {
                return record.fields[currentTableSearchField].toLowerCase();
            }
            
            // Otherwise try Name or name fields
            return (record.fields.Name || record.fields.name || '').toLowerCase();
        };
        
        const nameA = getDisplayName(a);
        const nameB = getDisplayName(b);
        
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

        // More flexible search formula that will match partial text anywhere in the Name field
        let URL = `https://api.airtable.com/v0/${selectedBase}/${selectedTable}?filterByFormula=${encodeURIComponent(`OR(FIND(LOWER("${searchText}"), LOWER({Name})), FIND("${searchText}", {Name}))`)}&${sortParams}`;

        if (offset) {
            URL += `&offset=${encodeURIComponent(offset)}`;
        }

        console.log("Fetching archive records from URL:", URL);
        
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

            // Get all records and filter them manually
            const query = await table.selectRecordsAsync({
                sorts: [{ field: currentTableSearchField, direction: 'asc' }]
            });

            console.log("Current base records fetched:", query.records.length);
            
            // Filter records that contain the search text in the configured search field (case insensitive)
            const filteredRecords = query.records.filter(record => {
                const fieldValue = record.getCellValue(currentTableSearchField);
                return fieldValue && 
                    fieldValue.toString().toLowerCase().includes(searchText.toLowerCase());
            });
            
            console.log("After filtering:", filteredRecords.length);

            // Convert Airtable block records to the same format as API records
            const currentRecords = filteredRecords.map(record => {
                try {
                    // Create fields object using the correct API methods
                    const fields = {};
                    
                    // Get the field IDs from the table schema
                    table.fields.forEach(field => {
                        // Use the getCellValue method instead of getCellValuesByFieldId
                        const value = record.getCellValue(field.id);
                        if (value !== null && value !== undefined) {
                            fields[field.name] = value;
                        }
                    });
                    
                    // Make sure we have the configured search field for display
                    if (fields[currentTableSearchField] && !fields.Name) {
                        fields.Name = fields[currentTableSearchField];
                    }
                    
                    return {
                        id: record.id,
                        fields: fields,
                        isArchive: false,
                        createdTime: record.createdTime || new Date().toISOString()
                    };
                } catch (error) {
                    console.error("Error processing record:", error);
                    return {
                        id: record.id,
                        fields: { Name: "Error loading record" },
                        isArchive: false,
                        createdTime: new Date().toISOString()
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
            console.log("Searching for:", searchText);
            
            // Fetch records from both bases
            const [archiveResult, currentResult] = await Promise.all([
                fetchRecordsFromArchiveBase(searchText, offset),
                fetchRecordsFromCurrentBase(searchText)
            ]);
            
            console.log("Archive records found:", archiveResult.records.length);
            console.log("Current records found:", currentResult.records.length);

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
            
            // Modified deduplication logic: Allow duplicates from different sources
            const uniqueRecords = [];
            const recordNamesBySource = {
                archive: new Set(),
                current: new Set()
            };

            allRecords.forEach(record => {
                const name = record.isArchive ? 
                    (record.fields.Name || '') : 
                    (record.fields[currentTableSearchField] || record.fields.Name || '');
                const sourceKey = record.isArchive ? 'archive' : 'current';
                
                // Only deduplicate within the same source
                if (name && !recordNamesBySource[sourceKey].has(name)) {
                    recordNamesBySource[sourceKey].add(name);
                    uniqueRecords.push(record);
                }
            });

            const sortedRecords = sortRecordsByName(uniqueRecords);
            setRecords(sortedRecords);
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

            // Modified deduplication logic: Allow duplicates from different sources
            const allRecords = [...archiveResult.records, ...currentResult.records];
            const uniqueRecords = [];
            const recordNamesBySource = {
                archive: new Set(),
                current: new Set()
            };

            allRecords.forEach(record => {
                const name = record.isArchive ? 
                    (record.fields.Name || '') : 
                    (record.fields[currentTableSearchField] || record.fields.Name || '');
                const sourceKey = record.isArchive ? 'archive' : 'current';
                
                // Only deduplicate within the same source
                if (name && !recordNamesBySource[sourceKey].has(name)) {
                    recordNamesBySource[sourceKey].add(name);
                    uniqueRecords.push(record);
                }
            });

            const sortedRecords = sortRecordsByName(uniqueRecords);
            setRecords(sortedRecords);
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
            
            // Modified deduplication logic: Allow duplicates from different sources
            const allRecords = [...archiveResult.records, ...currentResult.records];
            const uniqueRecords = [];
            const recordNamesBySource = {
                archive: new Set(),
                current: new Set()
            };

            allRecords.forEach(record => {
                const name = record.isArchive ? 
                    (record.fields.Name || '') : 
                    (record.fields[currentTableSearchField] || record.fields.Name || '');
                const sourceKey = record.isArchive ? 'archive' : 'current';
                
                // Only deduplicate within the same source
                if (name && !recordNamesBySource[sourceKey].has(name)) {
                    recordNamesBySource[sourceKey].add(name);
                    uniqueRecords.push(record);
                }
            });

            const sortedRecords = sortRecordsByName(uniqueRecords);
            setRecords(sortedRecords);
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
