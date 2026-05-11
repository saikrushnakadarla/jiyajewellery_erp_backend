const RepairModel = require('./../../models/sales/AssignWorker');

class RepairController {
    static async assignWorker(req, res) {
      const { order_number, worker_name, account_id } = req.body;
  
      try {
        if (!order_number || !worker_name || !account_id) {
          return res.status(400).json({
            success: false,
            message: 'Missing required fields'
          });
        }
  
        const result = await RepairModel.assignWorker(order_number, worker_name, account_id);
  
        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: 'No matching repair record found'
          });
        }
  
        res.json({
          success: true,
          message: 'Worker assigned successfully'
        });
      } catch (error) {
        console.error('Error assigning worker:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to assign worker',
          error: error.message
        });
      }
    }
  }

module.exports = RepairController;
