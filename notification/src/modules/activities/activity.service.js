const activityRepository = require('./activity.repository');

class ActivityService {

    async createActivity(data) {

        if (!data.entity_type) {
            throw new Error('entity_type is required');
        }

        if (!data.entity_id) {
            throw new Error('entity_id is required');
        }

        if (!data.action) {
            throw new Error('action is required');
        }

        return activityRepository.create(data);
    }


    async getActivity(id) {
        const activity = await activityRepository.findById(id);

        if (!activity) {
            throw new Error('Activity not found');
        }

        return activity;
    }


    async getEntityActivities(entityType, entityId, limit, offset) {
        return activityRepository.findByEntity(
            entityType,
            entityId,
            limit,
            offset
        );
    }


    async getUserActivities(userId, limit, offset) {
        return activityRepository.findByUser(
            userId,
            limit,
            offset
        );
    }


    async getAllActivities(limit, offset) {
        return activityRepository.findAll(
            limit,
            offset
        );
    }
}

module.exports = new ActivityService();