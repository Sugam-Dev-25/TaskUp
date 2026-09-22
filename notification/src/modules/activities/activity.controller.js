const activityService = require('./activity.service');

class ActivityController {

    async create(req, res) {
        try {

            const activity = await activityService.createActivity(
                req.body
            );

            return res.status(201).json({
                success: true,
                message: 'Activity created successfully',
                data: activity
            });

        } catch (error) {

            console.error('Create Activity Error:', error);

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }


    async getById(req, res) {
        try {

            const activity = await activityService.getActivity(
                req.params.id
            );

            return res.status(200).json({
                success: true,
                data: activity
            });

        } catch (error) {

            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }


    async getByEntity(req, res) {
        try {

            const {
                entityType,
                entityId
            } = req.params;

            const {
                limit = 50,
                offset = 0
            } = req.query;

            const activities =
                await activityService.getEntityActivities(
                    entityType,
                    entityId,
                    limit,
                    offset
                );

            return res.status(200).json({
                success: true,
                data: activities
            });

        } catch (error) {

            console.error('Get Entity Activities Error:', error);

            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }


    async getByUser(req, res) {
        try {

            const {
                limit = 50,
                offset = 0
            } = req.query;

            const activities =
                await activityService.getUserActivities(
                    req.params.userId,
                    limit,
                    offset
                );

            return res.status(200).json({
                success: true,
                data: activities
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }


    async getAll(req, res) {
        try {

            const {
                limit = 50,
                offset = 0
            } = req.query;

            const activities =
                await activityService.getAllActivities(
                    limit,
                    offset
                );

            return res.status(200).json({
                success: true,
                data: activities
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new ActivityController();