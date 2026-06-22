from django.contrib import admin
from .models import Room, Reservation

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'capacity')
    search_fields = ('name',)

@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('id', 'room', 'name', 'date', 'start_time', 'end_time', 'attendees', 'created_at')
    list_filter = ('date', 'room')
    search_fields = ('name',)
