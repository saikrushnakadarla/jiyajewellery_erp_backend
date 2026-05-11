const AssignedRepairDetails = require('../models/repairDetailsModel');

const assignController = {
    addRepairDetails: async (req, res) => {
        try {
            const requestData = req.body; // Array of repair details
            const repairIds = requestData.map((item) => item.repair_id); // Extract repair IDs

            // Insert data into assigned_repairdetails table
            await AssignedRepairDetails.bulkInsert(requestData);

            // Update status in repairs table
            await AssignedRepairDetails.updateRepairStatus(repairIds);

            res.status(200).json({ message: 'Data stored and status updated successfully!' });
        } catch (error) {
            console.error('Error storing data:', error);
            res.status(500).json({ error: 'Failed to store data and update status' });
        }
    },

    getAssignedRepairDetails: async (req, res) => {
        try {
            const repairDetails = await AssignedRepairDetails.fetchAssignedRepairDetails();
            res.status(200).json(repairDetails); // Return the fetched data as JSON
        } catch (error) {
            console.error('Error fetching repair details:', error);
            res.status(500).json({ error: 'Failed to fetch data' });
        }
    },

    deleteAssignedRepairDetail: async (req, res) => {
        const repairId = req.params.id;

        try {
            // Call the model function to delete the repair record
            const result = await AssignedRepairDetails.deleteAssignedRepairDetailById(repairId);

            // If no rows are affected, send a 404 response indicating that the repair was not found
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Repair record not found' });
            }

            // Send success response
            return res.status(200).json({ message: 'Repair record deleted successfully' });
        } catch (err) {
            console.error('Error deleting repair:', err);
            return res.status(500).json({ error: 'Failed to delete repair record' });
        }
    },

    updateRepairDetails: async (req, res) => {
        const { repair_id } = req.params;
        const { gross_wt_after_repair, total_amt, mc_for_repair } = req.body;

        try {
            const result = await AssignedRepairDetails.updateRepairDetails(repair_id, gross_wt_after_repair, total_amt, mc_for_repair);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Repair not found' });
            }

            res.status(200).json({ message: 'Repair updated successfully' });
        } catch (error) {
            console.error('Error updating repair:', error);
            res.status(500).json({ error: 'Failed to update repair' });
        }
    },

    updateStatus: async (req, res) => {
        const { repairId, status } = req.body;

        if (!repairId || !status) {
            return res.status(400).json({ error: 'repairId and status are required' });
        }

        try {
            const result = await AssignedRepairDetails.updateStatus(repairId, status);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Repair not found' });
            }

            res.status(200).json({ message: 'Repair status updated successfully' });
        } catch (error) {
            console.error('Error updating repair status:', error);
            res.status(500).json({ error: 'Failed to update repair status' });
        }
    },

    getAssignedRepairDetailsById: async (req, res) => {
        const { id } = req.params;

        try {
            const repairDetails = await AssignedRepairDetails.fetchAssignedRepairDetailsById(id);

            if (!repairDetails || repairDetails.length === 0) {
                return res.status(404).json({ message: 'No repair details found' });
            }

            res.status(200).json(repairDetails); // Return all records
        } catch (error) {
            console.error('Error fetching repair details:', error);
            res.status(500).json({ error: 'Failed to fetch repair details' });
        }
    },

    updateAssignedRepairDetail: async (req, res) => {
        const { id } = req.params;
        const { item_name, purity, qty, weight, rate_type, rate, amount } = req.body;

        try {
            const result = await AssignedRepairDetails.updateAssignedRepairDetail(
                id, item_name, purity, qty, weight, rate_type, rate, amount
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Repair detail not found' });
            }

            res.status(200).json({ message: 'Repair detail updated successfully' });
        } catch (error) {
            console.error('Error updating repair detail:', error);
            res.status(500).json({ error: 'Failed to update repair detail' });
        }
    },
};

module.exports = assignController;
