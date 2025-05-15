import { PrismaClient } from '@prisma/client';
import { InfluxDB } from '@influxdata/influxdb-client';

const prisma = new PrismaClient();

// Get all sources
export const getSources = async (req, res) => {
  try {
    const sources = await prisma.dataSource.findMany();
    res.json(sources);
  } catch (error) {
    console.error('Error getting sources:', error);
    res.status(500).json({ error: 'Failed to get sources' });
  }
};

// Get single source
export const getSource = async (req, res) => {
  try {
    const { id } = req.params;
    const source = await prisma.dataSource.findUnique({
      where: { id }
    });
    
    if (!source) {
      return res.status(404).json({ error: 'Data source not found' });
    }
    
    res.json(source);
  } catch (error) {
    console.error('Error getting source:', error);
    res.status(500).json({ error: 'Failed to get source' });
  }
};

// Create source
export const createSource = async (req, res) => {
  try {
    const { name, type, url, token, organization, database } = req.body;
    const source = await prisma.dataSource.create({
      data: {
        name,
        type,
        url,
        token,
        organization,
        database
      }
    });
    res.json(source);
  } catch (error) {
    console.error('Error creating source:', error);
    res.status(500).json({ error: 'Failed to create source' });
  }
};

// Update source
export const updateSource = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, url, token, organization, database } = req.body;
    
    const source = await prisma.dataSource.update({
      where: { id },
      data: {
        name,
        type,
        url,
        token,
        organization,
        database
      }
    });
    
    res.json(source);
  } catch (error) {
    console.error('Error updating source:', error);
    res.status(500).json({ error: 'Failed to update source' });
  }
};

// Delete source
export const deleteSource = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.dataSource.delete({
      where: { id }
    });
    res.json({ message: 'Source deleted successfully' });
  } catch (error) {
    console.error('Error deleting source:', error);
    res.status(500).json({ error: 'Failed to delete source' });
  }
};

// Test source connection
export const testSource = async (req, res) => {
  try {
    const { url, token, organization, bucket, database } = req.body;
    const bucketName = bucket || database; // Terima kedua parameter
    
    console.log('Testing connection with:', { url, organization, bucketName });

    if (!url || !token || !organization || !bucketName) {
      return res.status(400).json({
        error: 'Connection failed',
        details: 'URL, token, organization, dan bucket harus diisi'
      });
    }

    const client = new InfluxDB({
      url,
      token
    });

    const queryApi = client.getQueryApi(organization);
    
    // Test query to check connection
    const query = `from(bucket: "${bucketName}")
      |> range(start: -1m)
      |> limit(n: 1)`;
    
    try {
      await queryApi.queryRaw(query);
      res.json({ 
        status: 'success',
        message: 'Connection successful' 
      });
    } catch (queryError) {
      console.error('Query error:', queryError);
      let errorMessage = 'Connection failed';
      
      if (queryError.message.includes('unauthorized')) {
        errorMessage = 'Token tidak valid atau tidak memiliki akses';
      } else if (queryError.message.includes('bucket not found')) {
        errorMessage = 'Bucket tidak ditemukan';
      } else if (queryError.message.includes('organization not found')) {
        errorMessage = 'Organization tidak ditemukan';
      } else if (queryError.message.includes('ECONNREFUSED') || queryError.message.includes('ENOTFOUND')) {
        errorMessage = 'Tidak dapat terhubung ke server InfluxDB';
      }

      res.status(400).json({
        status: 'error',
        message: errorMessage,
        technical: queryError.message
      });
    }
  } catch (error) {
    console.error('Error testing source:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Terjadi kesalahan internal saat mencoba koneksi',
      technical: error.message
    });
  }
};

// Get metrics for a source
export const getSourceMetrics = async (req, res) => {
  try {
    const { id } = req.params;
    
    const source = await prisma.dataSource.findUnique({
      where: { id }
    });

    if (!source) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    const client = new InfluxDB({
      url: source.url,
      token: source.token
    });

    const queryApi = client.getQueryApi(source.organization);

    // Query untuk mendapatkan semua measurements
    const query = `
      import "influxdata/influxdb/schema"
      schema.measurements(bucket: "${source.database}")
    `;

    const result = await new Promise((resolve, reject) => {
      const measurements = [];
      queryApi.queryRows(query, {
        next(row, tableMeta) {
          const measurement = tableMeta.toObject(row)._value;
          measurements.push(measurement);
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve(measurements);
        },
      });
    });

    res.json(result);
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
};

// Execute query for a source
export const executeSourceQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { query } = req.body;

    const source = await prisma.dataSource.findUnique({
      where: { id }
    });

    if (!source) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    const client = new InfluxDB({
      url: source.url,
      token: source.token
    });

    const queryApi = client.getQueryApi(source.organization);

    const result = await new Promise((resolve, reject) => {
      const rows = [];
      queryApi.queryRows(query, {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row);
          rows.push(o);
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve(rows);
        },
      });
    });

    res.json(result);
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: 'Failed to execute query' });
  }
}; 