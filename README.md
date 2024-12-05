# Airtable Multi Base Search

This project is an Airtable extension that allows users to search records from a different base than the current one. It is aimed at searching archived records.

## Setup

1. Clone the repository:
    ```sh
    git clone https://github.com/uguryasar89/airtable-multibase-search.git
    cd airtable-payment-plans
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Create a `config.js` file in the root directory with your Airtable API token:
    ```javascript
    // config.js
    const config = {
        apiToken: 'Bearer YOUR_API_TOKEN_HERE'
    };

    export default config;
    ```

4. Add `config.js` to your `.gitignore` file to ensure it is not tracked by Git:
    ```ignore
    /node_modules
    /.airtableblocksrc.json
    /build
    /config.js
    ```

## Running the Project

1. Start the development server:
    ```sh
    block run
    ```

2. Open the Airtable extension development environment and load your extension.

## Usage

1. Select a base from the dropdown and click "Save Selected Base".
2. Select a table from the dropdown and click "Save Selected Table".
3. Enter a search term and press Enter to search for records.
4. Click on a record to open it in Airtable.

## License

This project is licensed under the MIT License.